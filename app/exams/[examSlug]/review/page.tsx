import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getExamMeta } from "@/lib/content/exam-content";
import { getReviewQueueStatus } from "@/lib/review/get-review-queue-status";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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

  const { data: dueRows } = await supabase
    .from("question_review_state")
    .select("question_id")
    .eq("user_id", user.id)
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(DUE_QUEUE_LIMIT);

  const dueIds = (dueRows ?? []).map((r) => r.question_id);

  if (dueIds.length === 0) {
    const status = await getReviewQueueStatus();
    // Nothing scheduled at all means review has never been started, which is
    // a different situation from having worked through everything that's due.
    const neverStarted = (status?.scheduledCount ?? 0) === 0;

    return (
      <Card className="p-6 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {neverStarted ? "Your review queue is empty" : "You're all caught up"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
        <Button href={`/exams/${examSlug}/quizzes`} className="mt-4">
          {neverStarted ? "Take a quiz" : "Practice quizzes"}
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
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">Review</h2>
        <p className="text-sm text-muted-foreground">{questions.length} question(s) due today</p>
      </div>
      <ReviewRunner examSlug={examSlug} questions={questions} />
    </div>
  );
}
