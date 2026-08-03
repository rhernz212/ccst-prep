import type { createClient } from "@/lib/supabase/server";
import { INITIAL_REVIEW_STATE, nextReviewState, type ReviewState } from "@/lib/domain/review/sm2";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface AnsweredQuestion {
  questionId: string;
  isCorrect: boolean;
}

/**
 * Advances (or creates) each question's spaced-repetition schedule for this
 * user. Best-effort: rescheduling must never fail the grading response it's
 * called alongside, so errors are swallowed rather than thrown.
 */
export async function recordReviewResults(
  supabase: SupabaseServerClient,
  userId: string,
  results: AnsweredQuestion[],
  now: Date = new Date()
): Promise<void> {
  if (results.length === 0) return;

  const questionIds = results.map((r) => r.questionId);
  const { data: existingRows } = await supabase
    .from("question_review_state")
    .select("question_id, repetitions, ease_factor, interval_days")
    .eq("user_id", userId)
    .in("question_id", questionIds);

  const existingByQuestionId = new Map<string, ReviewState>(
    (existingRows ?? []).map((row) => [
      row.question_id,
      { repetitions: row.repetitions, easeFactor: row.ease_factor, intervalDays: row.interval_days },
    ])
  );

  const nowIso = now.toISOString();
  const upserts = results.map((r) => {
    const current = existingByQuestionId.get(r.questionId) ?? INITIAL_REVIEW_STATE;
    const next = nextReviewState(current, r.isCorrect, now);
    return {
      user_id: userId,
      question_id: r.questionId,
      repetitions: next.repetitions,
      ease_factor: next.easeFactor,
      interval_days: next.intervalDays,
      due_at: next.dueAt,
      last_reviewed_at: nowIso,
    };
  });

  await supabase.from("question_review_state").upsert(upserts, { onConflict: "user_id,question_id" });
}
