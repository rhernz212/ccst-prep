import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreAttempt } from "@/lib/domain/exam/scoring";
import { recordReviewResults } from "@/lib/review/recordReviewResults";
import type { ExamSubmission } from "@/lib/exam/types";

export async function POST(request: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, exam_id, user_id, status, started_at, time_limit_minutes, score, domain_breakdown")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: "Exam attempt not found" }, { status: 404 });
  }

  // Idempotent: a client can call finalize more than once (e.g. the timer
  // firing right as the user clicks Submit) — just return the existing result.
  if (attempt.status !== "in_progress") {
    return NextResponse.json({
      overall: attempt.score ?? 0,
      correctCount: 0,
      totalCount: 0,
      byDomain: attempt.domain_breakdown ?? [],
      status: attempt.status,
    });
  }

  const body = (await request.json().catch(() => null)) as { answers?: ExamSubmission[] } | null;
  const answers = body?.answers ?? [];
  const answersByQuestionId = new Map(answers.map((a) => [a.questionId, a.selectedChoiceIds]));

  // Server is the source of truth for "is time up" — never trust the client clock.
  const elapsedMs = Date.now() - new Date(attempt.started_at).getTime();
  const timedOut = elapsedMs > attempt.time_limit_minutes * 60 * 1000;

  const { data: rawAttemptQuestions } = await supabase
    .from("exam_attempt_questions")
    .select(
      "id, question_id, domain_id, questions(explanation, question_choices(id, is_correct)), blueprint_domains(code, title)"
    )
    .eq("attempt_id", attemptId);

  // supabase-js infers embedded many-to-one relations (this row's one
  // question, this row's one domain) as arrays without generated DB types —
  // cast to the shape PostgREST actually returns at runtime.
  interface AttemptQuestionRow {
    id: string;
    question_id: string;
    domain_id: string | null;
    questions: { explanation: string | null; question_choices: { id: string; is_correct: boolean }[] } | null;
    blueprint_domains: { code: string; title: string } | null;
  }
  const attemptQuestions = (rawAttemptQuestions ?? []) as unknown as AttemptQuestionRow[];

  if (attemptQuestions.length === 0) {
    return NextResponse.json({ error: "No questions found for this attempt" }, { status: 500 });
  }

  const graded = attemptQuestions.map((aq) => {
    const selectedChoiceIds = answersByQuestionId.get(aq.question_id) ?? [];
    const choices = aq.questions?.question_choices ?? [];
    const correctChoiceIds = choices.filter((c) => c.is_correct).map((c) => c.id);
    const selectedSet = new Set(selectedChoiceIds);
    const isCorrect =
      correctChoiceIds.length === selectedSet.size && correctChoiceIds.every((id) => selectedSet.has(id));

    return {
      attemptQuestionId: aq.id,
      questionId: aq.question_id,
      selectedChoiceIds,
      isCorrect,
      domainCode: aq.blueprint_domains?.code ?? null,
      domainTitle: aq.blueprint_domains?.title ?? null,
    };
  });

  const domains = [...new Map(graded.filter((g) => g.domainCode).map((g) => [g.domainCode!, g])).values()].map(
    (g) => ({ code: g.domainCode!, title: g.domainTitle ?? g.domainCode! })
  );

  const score = scoreAttempt(
    graded.map((g) => ({ questionId: g.questionId, isCorrect: g.isCorrect, domainCode: g.domainCode })),
    domains
  );

  const finalStatus = timedOut ? "timed_out" : "submitted";

  const { error: updateAttemptError } = await supabase
    .from("exam_attempts")
    .update({
      status: finalStatus,
      submitted_at: new Date().toISOString(),
      score: score.overall,
      domain_breakdown: score.byDomain,
    })
    .eq("id", attemptId);

  if (updateAttemptError) {
    return NextResponse.json({ error: updateAttemptError.message }, { status: 500 });
  }

  await Promise.all(
    graded.map((g) =>
      supabase
        .from("exam_attempt_questions")
        .update({
          selected_choice_ids: g.selectedChoiceIds,
          is_correct: g.isCorrect,
          answered_at: new Date().toISOString(),
        })
        .eq("id", g.attemptQuestionId)
    )
  );

  await recordReviewResults(
    supabase,
    user.id,
    graded.map((g) => ({ questionId: g.questionId, isCorrect: g.isCorrect })),
    "exam"
  );

  return NextResponse.json({
    overall: score.overall,
    correctCount: score.correctCount,
    totalCount: score.totalCount,
    byDomain: score.byDomain,
    status: finalStatus,
  });
}
