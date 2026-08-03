import { describe, it, expect } from "vitest";
import { nextReviewState, INITIAL_REVIEW_STATE } from "@/lib/domain/review/sm2";

describe("nextReviewState", () => {
  const now = new Date("2026-08-03T00:00:00.000Z");

  it("schedules a first correct answer 1 day out", () => {
    const result = nextReviewState(INITIAL_REVIEW_STATE, true, now);
    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(1);
    expect(result.dueAt).toBe("2026-08-04T00:00:00.000Z");
  });

  it("schedules a second consecutive correct answer 6 days out", () => {
    const afterFirst = nextReviewState(INITIAL_REVIEW_STATE, true, now);
    const afterSecond = nextReviewState(afterFirst, true, now);
    expect(afterSecond.repetitions).toBe(2);
    expect(afterSecond.intervalDays).toBe(6);
  });

  it("scales the interval by the ease factor on the third+ correct answer", () => {
    const afterFirst = nextReviewState(INITIAL_REVIEW_STATE, true, now);
    const afterSecond = nextReviewState(afterFirst, true, now);
    const afterThird = nextReviewState(afterSecond, true, now);
    expect(afterThird.repetitions).toBe(3);
    expect(afterThird.intervalDays).toBe(Math.round(afterSecond.intervalDays * afterSecond.easeFactor));
  });

  it("resets repetitions and interval on an incorrect answer", () => {
    const streak = [true, true, true].reduce((state, correct) => nextReviewState(state, correct, now), INITIAL_REVIEW_STATE);
    const afterLapse = nextReviewState(streak, false, now);
    expect(afterLapse.repetitions).toBe(0);
    expect(afterLapse.intervalDays).toBe(1);
  });

  it("grows the ease factor on a correct streak", () => {
    const afterFirst = nextReviewState(INITIAL_REVIEW_STATE, true, now);
    const afterSecond = nextReviewState(afterFirst, true, now);
    expect(afterFirst.easeFactor).toBeGreaterThan(INITIAL_REVIEW_STATE.easeFactor);
    expect(afterSecond.easeFactor).toBeGreaterThan(afterFirst.easeFactor);
  });

  it("shrinks the ease factor on an incorrect answer", () => {
    const result = nextReviewState(INITIAL_REVIEW_STATE, false, now);
    expect(result.easeFactor).toBeLessThan(INITIAL_REVIEW_STATE.easeFactor);
  });

  it("never lets the ease factor drop below 1.3", () => {
    let state = { repetitions: 0, easeFactor: 1.35, intervalDays: 1 };
    state = nextReviewState(state, false, now);
    expect(state.easeFactor).toBeCloseTo(1.3);
    state = nextReviewState(state, false, now);
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});
