import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

export interface ReviewQueueStatus {
  /** Questions scheduled at or before now. */
  dueCount: number;
  /** Questions with any schedule at all — 0 means review has never been started. */
  scheduledCount: number;
  /** When the earliest not-yet-due question comes up, if nothing is due now. */
  nextDueAt: string | null;
}

/**
 * Counts the signed-in user's spaced-repetition queue for one exam.
 *
 * Distinguishing "nothing due" from "nothing scheduled" is the point: a
 * brand-new user has never answered a question, so the queue is empty for a
 * completely different reason than someone who has genuinely caught up, and
 * telling them "you're all caught up" hides the feature instead of
 * explaining it.
 *
 * Scoped by exam through the question each row schedules. It used to count
 * across every exam, which meant the Review badge on a CCST page could
 * advertise cards that only exist in the Network+ bank — and the Review tab
 * would then show none of them.
 */
export async function getReviewQueueStatus(examSlug: string): Promise<ReviewQueueStatus | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  // `questions!inner(...)` turns the embed into a join, so filtering on
  // `questions.exams.slug` filters the review rows themselves rather than
  // just trimming what's embedded in each one.
  const scopedToExam = () =>
    supabase
      .from("question_review_state")
      .select("id, questions!inner(exams!inner(slug))", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("questions.exams.slug", examSlug);

  const [{ count: dueCount }, { count: scheduledCount }] = await Promise.all([
    scopedToExam().lte("due_at", nowIso),
    scopedToExam(),
  ]);

  const due = dueCount ?? 0;
  let nextDueAt: string | null = null;

  if (due === 0 && (scheduledCount ?? 0) > 0) {
    const { data } = await supabase
      .from("question_review_state")
      .select("due_at, questions!inner(exams!inner(slug))")
      .eq("user_id", user.id)
      .eq("questions.exams.slug", examSlug)
      .gt("due_at", nowIso)
      .order("due_at")
      .limit(1)
      .maybeSingle();
    nextDueAt = data?.due_at ?? null;
  }

  return { dueCount: due, scheduledCount: scheduledCount ?? 0, nextDueAt };
}
