import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DomainScoreChart } from "@/components/exam/DomainScoreChart";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { DomainBreakdownEntry } from "@/lib/exam/types";

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ examSlug: string; attemptId: string }>;
}) {
  const { examSlug, attemptId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(`/exams/${examSlug}/exam`)}`);
  }

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, status, score, domain_breakdown, user_id")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== user.id) notFound();
  if (attempt.status === "in_progress") {
    redirect(`/exams/${examSlug}/exam/run?attemptId=${attemptId}`);
  }

  const { data: rawAttemptQuestions } = await supabase
    .from("exam_attempt_questions")
    .select(
      "order_index, selected_choice_ids, is_correct, questions(id, stem, is_multi_select, explanation, question_choices(id, label, body, is_correct, order_index))"
    )
    .eq("attempt_id", attemptId)
    .order("order_index");

  // supabase-js infers the embedded many-to-one relation (this row's one
  // question) as an array without generated DB types — cast to the shape
  // PostgREST actually returns at runtime.
  interface AttemptQuestionRow {
    order_index: number;
    selected_choice_ids: string[] | null;
    is_correct: boolean | null;
    questions: {
      id: string;
      stem: string;
      is_multi_select: boolean;
      explanation: string | null;
      question_choices: { id: string; label: string; body: string; is_correct: boolean; order_index: number }[];
    } | null;
  }
  const attemptQuestions = (rawAttemptQuestions ?? []) as unknown as AttemptQuestionRow[];

  const pct = Math.round((attempt.score ?? 0) * 100);
  const byDomain = (attempt.domain_breakdown ?? []) as DomainBreakdownEntry[];

  return (
    <div className="animate-fade-in-up">
      <Card className="p-6 text-center">
        <div className="text-sm text-muted-foreground">
          {attempt.status === "timed_out" ? "Time expired" : "Exam submitted"}
        </div>
        <div className="animate-pop mt-1 text-4xl font-bold text-foreground">{pct}%</div>
        <div className="mt-4">
          <Button href={`/exams/${examSlug}/exam`}>Back to exam overview</Button>
        </div>
      </Card>

      {byDomain.length > 0 && (
        <Card className="mt-8 p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Score by Domain</h3>
          <DomainScoreChart byDomain={byDomain} />
        </Card>
      )}

      <div className="mt-8 space-y-8">
        {attemptQuestions.map((aq, i) => {
          if (!aq.questions) return null;
          const q = aq.questions;
          const correctChoiceIds = (q.question_choices ?? []).filter((c) => c.is_correct).map((c) => c.id);
          const choices = (q.question_choices ?? [])
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((c) => ({ id: c.id, label: c.label, body: c.body }));

          return (
            <QuestionCard
              key={q.id}
              index={i}
              total={attemptQuestions.length}
              stem={q.stem}
              choices={choices}
              isMultiSelect={q.is_multi_select}
              selectedIds={aq.selected_choice_ids ?? []}
              review={{
                isCorrect: aq.is_correct ?? false,
                correctChoiceIds,
                explanation: q.explanation ?? "",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
