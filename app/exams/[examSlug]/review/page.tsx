import { notFound, redirect } from "next/navigation";
import { ArrowRight, Check, Flame, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getExamMeta } from "@/lib/content/exam-content";
import { getReviewQueueStatus } from "@/lib/review/get-review-queue-status";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ReviewRunner } from "@/components/review/ReviewRunner";
import type { QuizQuestion } from "@/lib/quiz/types";

const DUE_QUEUE_LIMIT = 20;

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(`/exams/${examSlug}/review`)}`);
  }

  const { data: examRow } = await supabase.from("exams").select("id").eq("slug", examSlug).maybeSingle();
  if (!examRow) notFound();

  // Scoped to this exam through the question it schedules. Without the join
  // the queue was global: someone studying two certifications could fill all
  // 20 slots with the other exam's cards, and since the questions query below
  // *is* exam-filtered, the runner would then be handed an empty list while
  // the "you're caught up" branch had already been skipped.
  const { data: dueRows } = await supabase
    .from("question_review_state")
    .select("question_id, questions!inner(exam_id)")
    .eq("user_id", user.id)
    .eq("questions.exam_id", examRow.id)
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(DUE_QUEUE_LIMIT);

  const dueIds = (dueRows ?? []).map((r) => r.question_id);

  if (dueIds.length === 0) {
    const status = await getReviewQueueStatus(examSlug);
    // Nothing scheduled at all means review has never been started, which is
    // a different situation from having worked through everything that's due.
    const neverStarted = (status?.scheduledCount ?? 0) === 0;

    return (
      <Card className="aura mx-auto max-w-lg p-8 text-center sm:p-10">
        {/* Empty states are where a study app most easily feels dead. The
            illustrated mark and the pulse ring give this one a focal point so
            it reads as a milestone rather than as a missing page. */}
        <span className="relative mx-auto mb-5 grid h-16 w-16 place-items-center" aria-hidden="true">
          <span
            className={`absolute inset-0 rounded-full ${
              neverStarted ? "bg-brand-500/15" : "bg-success-500/15"
            }`}
          />
          <span
            className={`grid h-14 w-14 place-items-center rounded-full text-white shadow-raised ${
              neverStarted
                ? "bg-linear-to-br from-brand-400 to-brand-600"
                : "bg-linear-to-br from-success-400 to-success-600"
            }`}
          >
            {neverStarted ? (
              <Sparkles className="h-6 w-6" />
            ) : (
              <Check className="h-7 w-7" strokeWidth={2.5} />
            )}
          </span>
        </span>

        <h2 className="text-fluid-lg font-semibold text-foreground">
          {neverStarted ? "Your review queue is empty" : "You're all caught up"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {neverStarted ? (
            <>
              Questions are added here automatically as you answer them in quizzes and practice
              exams, then scheduled for review at widening intervals so they stick. Take a quiz to
              get started.
            </>
          ) : (
            <>
              Nothing is due right now — you&apos;ve reviewed all{" "}
              {status?.scheduledCount ?? 0} scheduled question(s).
              {status?.nextDueAt && (
                <>
                  {" "}
                  The next one is due{" "}
                  {new Date(status.nextDueAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  .
                </>
              )}
            </>
          )}
        </p>
        <Button href={`/exams/${examSlug}/quizzes`} className="mt-6">
          {neverStarted ? "Take a quiz" : "Practice quizzes"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Card>
    );
  }

  const { data: rawQuestions } = await supabase
    .from("questions")
    .select("id, stem, is_multi_select, question_choices(id, label, body, order_index)")
    .eq("exam_id", examRow.id)
    .in("id", dueIds);

  const questionsById = new Map((rawQuestions ?? []).map((q) => [q.id, q]));
  const questions: QuizQuestion[] = dueIds
    .map((id) => questionsById.get(id))
    .filter((q): q is NonNullable<typeof q> => q !== undefined)
    .map((q) => ({
      id: q.id,
      stem: q.stem,
      isMultiSelect: q.is_multi_select,
      choices: (q.question_choices ?? [])
        .slice()
        .sort((a, b) => a.order_index - b.order_index)
        .map((c) => ({ id: c.id, label: c.label, body: c.body })),
    }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-fluid-xl font-semibold text-foreground">Review</h2>
        <Badge variant="accent">
          <Flame className="h-3 w-3" aria-hidden="true" />
          {questions.length} due today
        </Badge>
      </div>
      <ReviewRunner examSlug={examSlug} questions={questions} />
    </div>
  );
}
