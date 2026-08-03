import { describe, expect, it } from "vitest";
import {
  aggregateDomainPerformance,
  summarizeTrend,
  type AttemptSummary,
} from "@/lib/domain/exam/attemptHistory";

function attempt(score: number, domains: [string, number, number][]): AttemptSummary {
  return {
    score,
    domainBreakdown: domains.map(([code, correct, total]) => ({
      domainCode: code,
      domainTitle: `Domain ${code}`,
      correct,
      total,
    })),
  };
}

describe("aggregateDomainPerformance", () => {
  it("sums counts for the same domain across attempts", () => {
    const result = aggregateDomainPerformance([
      attempt(0.5, [["1", 2, 4]]),
      attempt(0.75, [["1", 4, 4]]),
    ]);

    expect(result).toEqual([
      { domainCode: "1", domainTitle: "Domain 1", correct: 6, total: 8, ratio: 0.75 },
    ]);
  });

  it("orders weakest domain first", () => {
    const result = aggregateDomainPerformance([
      attempt(0.6, [
        ["1", 9, 10],
        ["2", 2, 10],
        ["3", 5, 10],
      ]),
    ]);

    expect(result.map((d) => d.domainCode)).toEqual(["2", "3", "1"]);
  });

  it("weights by question count rather than averaging per-attempt percentages", () => {
    // 1/1 in one attempt then 0/9 in the next is 10%, not the 50% a naive
    // mean of the two attempt percentages would give.
    const result = aggregateDomainPerformance([
      attempt(1, [["1", 1, 1]]),
      attempt(0, [["1", 0, 9]]),
    ]);

    expect(result[0].ratio).toBeCloseTo(0.1);
  });

  it("drops domains that were never sampled", () => {
    const result = aggregateDomainPerformance([
      attempt(0.5, [
        ["1", 3, 6],
        ["2", 0, 0],
      ]),
    ]);

    expect(result.map((d) => d.domainCode)).toEqual(["1"]);
  });

  it("returns an empty list when there are no attempts", () => {
    expect(aggregateDomainPerformance([])).toEqual([]);
  });
});

describe("summarizeTrend", () => {
  it("reports best, latest and the change since the previous attempt", () => {
    // newest-first, matching the page's query order
    const trend = summarizeTrend([attempt(0.7, []), attempt(0.5, []), attempt(0.9, [])]);

    expect(trend).toMatchObject({ attemptCount: 3, best: 0.9, latest: 0.7 });
    expect(trend?.delta).toBeCloseTo(0.2);
  });

  it("reports a negative delta when the latest attempt regressed", () => {
    const trend = summarizeTrend([attempt(0.4, []), attempt(0.8, [])]);
    expect(trend?.delta).toBeCloseTo(-0.4);
  });

  it("has no delta for a first attempt", () => {
    expect(summarizeTrend([attempt(0.6, [])])).toEqual({
      attemptCount: 1,
      best: 0.6,
      latest: 0.6,
      delta: null,
    });
  });

  it("returns null for no attempts", () => {
    expect(summarizeTrend([])).toBeNull();
  });
});
