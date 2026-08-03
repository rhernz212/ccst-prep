/**
 * SM-2 spaced-repetition scheduling. This app only has a binary correctness
 * signal (no confidence/hesitation rating), so correctness maps to SM-2's
 * 0-5 quality scale as: correct -> 5 ("perfect recall"), incorrect -> 2
 * ("incorrect, but the right answer was recognizable once shown" - matches
 * this app's flow of revealing the correct choice + explanation on grading).
 */

export interface ReviewState {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
}

export interface ReviewResult extends ReviewState {
  dueAt: string;
}

export const INITIAL_REVIEW_STATE: ReviewState = {
  repetitions: 0,
  easeFactor: 2.5,
  intervalDays: 0,
};

const EASE_FACTOR_FLOOR = 1.3;
const CORRECT_QUALITY = 5;
const INCORRECT_QUALITY = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function nextReviewState(current: ReviewState, isCorrect: boolean, now: Date): ReviewResult {
  const quality = isCorrect ? CORRECT_QUALITY : INCORRECT_QUALITY;

  let repetitions: number;
  let intervalDays: number;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (current.repetitions === 0) {
      intervalDays = 1;
    } else if (current.repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(current.intervalDays * current.easeFactor);
    }
    repetitions = current.repetitions + 1;
  }

  const easeFactor = Math.max(
    EASE_FACTOR_FLOOR,
    current.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const dueAt = new Date(now.getTime() + intervalDays * MS_PER_DAY).toISOString();

  return { repetitions, easeFactor, intervalDays, dueAt };
}
