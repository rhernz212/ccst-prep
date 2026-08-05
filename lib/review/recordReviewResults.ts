import type { createClient } from "@/lib/supabase/server";
import { INITIAL_REVIEW_STATE, nextReviewState, type ReviewState } from "@/lib/domain/review/sm2";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MS_PER_DAY = 86_400_000;

/** Where an answer came from. See the `source` column on review_events. */
export type ReviewSource = "quiz" | "review" | "exam";

interface AnsweredQuestion {
  questionId: string;
  isCorrect: boolean;
}

/**
 * Advances (or creates) each question's spaced-repetition schedule for this
 * user, and appends what happened to the review log.
 *
 * Best-effort: rescheduling must never fail the grading response it's called
 * alongside, so errors are swallowed rather than thrown.
 *
 * The log is written here rather than at each call site because this is the
 * only place that knows both halves of an event — the state a question was in
 * before the answer, and the state the scheduler moved it to. See
 * 20260805090000_review_events.sql for why that history is worth keeping.
 */
export async function recordReviewResults(
  supabase: SupabaseServerClient,
  userId: string,
  results: AnsweredQuestion[],
  source: ReviewSource,
  now: Date = new Date()
): Promise<void> {
  if (results.length === 0) return;

  const questionIds = results.map((r) => r.questionId);
  const { data: existingRows } = await supabase
    .from("question_review_state")
    .select("question_id, repetitions, ease_factor, interval_days, last_reviewed_at")
    .eq("user_id", userId)
    .in("question_id", questionIds);

  const existingByQuestionId = new Map<
    string,
    ReviewState & { lastReviewedAt: string | null }
  >(
    (existingRows ?? []).map((row) => [
      row.question_id,
      {
        repetitions: row.repetitions,
        easeFactor: row.ease_factor,
        intervalDays: row.interval_days,
        lastReviewedAt: row.last_reviewed_at,
      },
    ])
  );

  const nowIso = now.toISOString();

  const advanced = results.map((r) => {
    const existing = existingByQuestionId.get(r.questionId);
    const current: ReviewState = existing ?? INITIAL_REVIEW_STATE;
    const next = nextReviewState(current, r.isCorrect, now);

    return { ...r, existing, current, next };
  });

  await supabase.from("question_review_state").upsert(
    advanced.map(({ questionId, next }) => ({
      user_id: userId,
      question_id: questionId,
      repetitions: next.repetitions,
      ease_factor: next.easeFactor,
      interval_days: next.intervalDays,
      due_at: next.dueAt,
      last_reviewed_at: nowIso,
    })),
    { onConflict: "user_id,question_id" }
  );

  await supabase.from("review_events").insert(
    advanced.map(({ questionId, isCorrect, existing, current, next }) => ({
      user_id: userId,
      question_id: questionId,
      reviewed_at: nowIso,
      source,
      is_correct: isCorrect,
      // Null on a question's first ever answer — there's no previous sighting
      // to measure from, which is itself meaningful to a memory model.
      elapsed_days: existing?.lastReviewedAt
        ? (now.getTime() - new Date(existing.lastReviewedAt).getTime()) / MS_PER_DAY
        : null,
      prev_repetitions: existing ? current.repetitions : null,
      prev_ease_factor: existing ? current.easeFactor : null,
      prev_interval_days: existing ? current.intervalDays : null,
      next_repetitions: next.repetitions,
      next_ease_factor: next.easeFactor,
      next_interval_days: next.intervalDays,
      next_due_at: next.dueAt,
    }))
  );
}
