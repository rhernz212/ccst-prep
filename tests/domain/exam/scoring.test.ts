import { describe, it, expect } from "vitest";
import { scoreAttempt } from "@/lib/domain/exam/scoring";

describe("scoreAttempt", () => {
  const domains = [
    { code: "1", title: "Standards and Concepts" },
    { code: "2", title: "Addressing and Subnet Formats" },
  ];

  it("computes overall score and per-domain breakdown", () => {
    const result = scoreAttempt(
      [
        { questionId: "a", isCorrect: true, domainCode: "1" },
        { questionId: "b", isCorrect: false, domainCode: "1" },
        { questionId: "c", isCorrect: true, domainCode: "2" },
      ],
      domains
    );
    expect(result.correctCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.overall).toBeCloseTo(2 / 3);

    const domain1 = result.byDomain.find((d) => d.domainCode === "1")!;
    expect(domain1.correct).toBe(1);
    expect(domain1.total).toBe(2);

    const domain2 = result.byDomain.find((d) => d.domainCode === "2")!;
    expect(domain2.correct).toBe(1);
    expect(domain2.total).toBe(1);
  });

  it("omits domains with zero questions from the breakdown", () => {
    const result = scoreAttempt([{ questionId: "a", isCorrect: true, domainCode: "1" }], domains);
    expect(result.byDomain.find((d) => d.domainCode === "2")).toBeUndefined();
  });

  it("ignores null-domain (backfilled) responses in the per-domain breakdown but counts them overall", () => {
    const result = scoreAttempt(
      [
        { questionId: "a", isCorrect: true, domainCode: "1" },
        { questionId: "b", isCorrect: false, domainCode: null },
      ],
      domains
    );
    expect(result.totalCount).toBe(2);
    expect(result.correctCount).toBe(1);
    expect(result.byDomain).toHaveLength(1);
  });

  it("handles an empty response list without dividing by zero", () => {
    const result = scoreAttempt([], domains);
    expect(result.overall).toBe(0);
  });
});
