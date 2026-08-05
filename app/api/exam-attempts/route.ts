import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  selectExamQuestions,
  type DomainInfo,
  type QuestionExposure,
  type QuestionForSelection,
} from "@/lib/domain/exam/questionSelector";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { examSlug?: string } | null;
  const examSlug = body?.examSlug;
  if (typeof examSlug !== "string") {
    return NextResponse.json({ error: "examSlug is required" }, { status: 400 });
  }

  const { data: exam } = await supabase
    .from("exams")
    .select("id, time_limit_minutes, question_count")
    .eq("slug", examSlug)
    .maybeSingle();
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const { data: domainRows } = await supabase
    .from("blueprint_domains")
    .select("id, code, title, weight, blueprint_objectives(chapter_numbers)")
    .eq("exam_id", exam.id);

  const domains: DomainInfo[] = (domainRows ?? []).map((d) => ({
    code: d.code,
    title: d.title,
    weight: d.weight,
    chapterNumbers: [
      ...new Set((d.blueprint_objectives ?? []).flatMap((o) => o.chapter_numbers ?? [])),
    ],
  }));
  const domainIdByCode = new Map((domainRows ?? []).map((d) => [d.code, d.id]));

  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, chapters(number)")
    .eq("exam_id", exam.id);

  // supabase-js infers embedded many-to-one relations (questions -> its one
  // chapter) as arrays without generated DB types — cast to the shape
  // PostgREST actually returns at runtime.
  interface QuestionChapterRow {
    id: string;
    chapters: { number: number } | null;
  }
  const questionPool: QuestionForSelection[] = ((questionRows ?? []) as unknown as QuestionChapterRow[])
    .filter((q): q is QuestionChapterRow & { chapters: { number: number } } => q.chapters?.number != null)
    .map((q) => ({ id: q.id, chapterNumber: q.chapters.number }));

  if (questionPool.length === 0 || domains.length === 0) {
    return NextResponse.json(
      { error: "This exam doesn't have a seeded question bank yet." },
      { status: 409 }
    );
  }

  // How many of this user's past attempts on this exam included each
  // question, and when the most recent one was — scoped through the join to
  // exam_attempts rather than a separate exposure table, since the selection
  // an attempt started with already records exactly this.
  //
  // Counted from every attempt regardless of status: the questions were
  // shown the moment the attempt started, whether or not it was ever
  // finished, so an abandoned attempt still counts as exposure. Deliberately
  // scoped to past *exams* only, not quizzes or reviews — a full mock sitting
  // repeated with mostly the same questions is the specific failure this
  // exists to prevent (real question banks in this space are small enough
  // that three sittings can start to converge on "what you've memorized"
  // rather than "what you know"); a chapter quiz redraws its whole chapter
  // every time by design and isn't the same problem.
  const { data: exposureRows } = await supabase
    .from("exam_attempt_questions")
    .select("question_id, exam_attempts!inner(started_at)")
    .eq("exam_attempts.user_id", user.id)
    .eq("exam_attempts.exam_id", exam.id);

  interface ExposureRow {
    question_id: string;
    exam_attempts: { started_at: string } | null;
  }
  const exposure = new Map<string, QuestionExposure>();
  for (const row of (exposureRows ?? []) as unknown as ExposureRow[]) {
    const startedAtMs = row.exam_attempts ? new Date(row.exam_attempts.started_at).getTime() : 0;
    const existing = exposure.get(row.question_id);
    if (existing) {
      existing.timesSeen += 1;
      existing.lastSeenAtMs = Math.max(existing.lastSeenAtMs, startedAtMs);
    } else {
      exposure.set(row.question_id, { timesSeen: 1, lastSeenAtMs: startedAtMs });
    }
  }

  const selection = selectExamQuestions(
    domains,
    questionPool,
    exam.question_count,
    Math.random,
    exposure
  );

  const { data: attempt, error: attemptError } = await supabase
    .from("exam_attempts")
    .insert({
      user_id: user.id,
      exam_id: exam.id,
      status: "in_progress",
      time_limit_minutes: exam.time_limit_minutes,
    })
    .select()
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: attemptError?.message ?? "Failed to start exam" }, { status: 500 });
  }

  const attemptQuestionRows = selection.map((s, index) => ({
    attempt_id: attempt.id,
    question_id: s.questionId,
    domain_id: s.domainCode ? domainIdByCode.get(s.domainCode) ?? null : null,
    order_index: index,
  }));

  const { error: insertError } = await supabase.from("exam_attempt_questions").insert(attemptQuestionRows);
  if (insertError) {
    // Best-effort cleanup so a failed start doesn't leave an orphaned attempt.
    await supabase.from("exam_attempts").delete().eq("id", attempt.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ attemptId: attempt.id });
}
