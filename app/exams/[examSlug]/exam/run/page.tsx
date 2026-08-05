import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { ExamRunner } from "@/components/exam/ExamRunner";
import type { ExamQuestion } from "@/lib/exam/types";

export default async function ExamRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ examSlug: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}) {
  const { examSlug } = await params;
  const { attemptId } = await searchParams;
  if (!attemptId) notFound();

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(`/exams/${examSlug}/exam`)}`);
  }

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, status, started_at, time_limit_minutes, user_id")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== user.id) notFound();
  if (attempt.status !== "in_progress") {
    redirect(`/exams/${examSlug}/exam/${attemptId}/results`);
  }

  const { data: rawAttemptQuestions } = await supabase
    .from("exam_attempt_questions")
    .select(
      "order_index, selected_choice_ids, questions(id, stem, is_multi_select, question_choices(id, label, body, order_index))"
    )
    .eq("attempt_id", attemptId)
    .order("order_index");

  // supabase-js infers the embedded many-to-one relation (this row's one
  // question) as an array without generated DB types — cast to the shape
  // PostgREST actually returns at runtime.
  interface AttemptQuestionRow {
    order_index: number;
    selected_choice_ids: string[] | null;
    questions: {
      id: string;
      stem: string;
      is_multi_select: boolean;
      question_choices: { id: string; label: string; body: string; order_index: number }[];
    } | null;
  }
  const attemptQuestions = (rawAttemptQuestions ?? []) as unknown as AttemptQuestionRow[];

  const questions: ExamQuestion[] = attemptQuestions
    .filter((aq): aq is AttemptQuestionRow & { questions: NonNullable<AttemptQuestionRow["questions"]> } => aq.questions !== null)
    .map((aq) => ({
      id: aq.questions.id,
      stem: aq.questions.stem,
      isMultiSelect: aq.questions.is_multi_select,
      choices: aq.questions.question_choices
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((c) => ({ id: c.id, label: c.label, body: c.body })),
    }));

  if (questions.length === 0) notFound();

  // Whatever was already answered, so reopening a half-finished attempt picks
  // up where it stopped rather than presenting fifty blank questions with the
  // clock still running.
  const initialAnswers: Record<string, string[]> = {};
  for (const aq of attemptQuestions) {
    if (aq.questions && aq.selected_choice_ids?.length) {
      initialAnswers[aq.questions.id] = aq.selected_choice_ids;
    }
  }

  return (
    <ExamRunner
      examSlug={examSlug}
      attemptId={attemptId}
      startedAt={attempt.started_at}
      timeLimitMinutes={attempt.time_limit_minutes}
      questions={questions}
      initialAnswers={initialAnswers}
    />
  );
}
