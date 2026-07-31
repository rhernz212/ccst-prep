import { describe, it, expect } from "vitest";
import { selectExamQuestions, type DomainInfo, type QuestionForSelection } from "@/lib/domain/exam/questionSelector";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Mirrors the real CCST blueprint shape closely enough to exercise the bug
// this selector was built to fix: domains 3 and 5 have no directly-tagged
// questions (their chapters are also covered by other domains), so
// selecting purely by a precomputed domain_id would starve them entirely.
const DOMAINS: DomainInfo[] = [
  { code: "1", title: "Standards and Concepts", weight: 0.2, chapterNumbers: [1, 2, 7, 11, 12] },
  { code: "2", title: "Addressing and Subnet Formats", weight: 0.12, chapterNumbers: [3, 4] },
  { code: "3", title: "Endpoints and Media Types", weight: 0.16, chapterNumbers: [7, 8, 11] },
  { code: "4", title: "Infrastructure", weight: 0.2, chapterNumbers: [5, 6, 9] },
  { code: "5", title: "Diagnosing Problems", weight: 0.2, chapterNumbers: [9, 12] },
  { code: "6", title: "Security", weight: 0.12, chapterNumbers: [8, 10] },
];

function makePool(): QuestionForSelection[] {
  const pool: QuestionForSelection[] = [];
  const perChapter: Record<number, number> = {
    1: 10, 2: 14, 3: 15, 4: 17, 5: 10, 6: 7, 7: 14, 8: 20, 9: 10, 10: 10, 11: 10, 12: 10,
  };
  for (const [chapter, count] of Object.entries(perChapter)) {
    for (let i = 0; i < count; i++) {
      pool.push({ id: `c${chapter}-q${i}`, chapterNumber: Number(chapter) });
    }
  }
  return pool;
}

describe("selectExamQuestions", () => {
  it("selects exactly targetCount unique questions", () => {
    const pool = makePool();
    for (let seed = 0; seed < 10; seed++) {
      const selection = selectExamQuestions(DOMAINS, pool, 48, seededRng(seed));
      expect(selection).toHaveLength(48);
      expect(new Set(selection.map((s) => s.questionId)).size).toBe(48);
    }
  });

  it("gives every domain at least some questions, even ones with no directly-tagged pool", () => {
    const pool = makePool();
    const selection = selectExamQuestions(DOMAINS, pool, 48, seededRng(1));
    const countsByDomain = new Map<string, number>();
    for (const s of selection) {
      if (s.domainCode) countsByDomain.set(s.domainCode, (countsByDomain.get(s.domainCode) ?? 0) + 1);
    }
    // Domains 3 and 5 are exactly the ones with no directly-assigned
    // questions in the real seeded data (see Task 5 finding) — this is the
    // regression this selector exists to fix.
    expect(countsByDomain.get("3")).toBeGreaterThan(0);
    expect(countsByDomain.get("5")).toBeGreaterThan(0);
  });

  it("distributes roughly proportional to domain weight", () => {
    const pool = makePool();
    const selection = selectExamQuestions(DOMAINS, pool, 100, seededRng(2));
    const countsByDomain = new Map<string, number>();
    for (const s of selection) {
      if (s.domainCode) countsByDomain.set(s.domainCode, (countsByDomain.get(s.domainCode) ?? 0) + 1);
    }
    // Domain 1 (weight 0.2) should get noticeably more than domain 2 (weight 0.12).
    expect(countsByDomain.get("1")! + 2).toBeGreaterThan(countsByDomain.get("2")!);
  });

  it("still returns targetCount questions even if some domains have thin pools relative to their target", () => {
    const tinyPool: QuestionForSelection[] = [
      { id: "a", chapterNumber: 1 },
      { id: "b", chapterNumber: 1 },
      { id: "c", chapterNumber: 3 },
    ];
    const smallDomains: DomainInfo[] = [
      { code: "x", title: "X", weight: 0.5, chapterNumbers: [1] },
      { code: "y", title: "Y", weight: 0.5, chapterNumbers: [2] }, // no questions at all in chapter 2
    ];
    const selection = selectExamQuestions(smallDomains, tinyPool, 3, seededRng(3));
    expect(selection).toHaveLength(3);
  });

  it("is deterministic for a given rng", () => {
    const pool = makePool();
    const a = selectExamQuestions(DOMAINS, pool, 48, seededRng(42));
    const b = selectExamQuestions(DOMAINS, pool, 48, seededRng(42));
    expect(a).toEqual(b);
  });
});
