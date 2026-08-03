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
 * Counts the signed-in user's spaced-repetition queue.
 *
 * Distinguishing "nothing due" from "nothing scheduled" is the point: a
 * brand-new user has never answered a question, so the queue is empty for a
 * completely different reason than someone who has genuinely caught up, and
 * telling them "you're all caught up" hides the feature instead of
 * explaining it.
 */
export async function getReviewQueueStatus(): Promise<ReviewQueueStatus | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [{ count: dueCount }, { count: scheduledCount }] = await Promise.all([
    supabase
      .from("question_review_state")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("due_at", nowIso),
    supabase
      .from("question_review_state")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const due = dueCount ?? 0;
  let nextDueAt: string | null = null;

  if (due === 0 && (scheduledCount ?? 0) > 0) {
    const { data } = await supabase
      .from("question_review_state")
      .select("due_at")
      .eq("user_id", user.id)
      .gt("due_at", nowIso)
      .order("due_at")
      .limit(1)
      .maybeSingle();
    nextDueAt = data?.due_at ?? null;
  }

  return { dueCount: due, scheduledCount: scheduledCount ?? 0, nextDueAt };
}
