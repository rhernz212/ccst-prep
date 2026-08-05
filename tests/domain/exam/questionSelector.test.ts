import { describe, it, expect } from "vitest";
import {
  selectExamQuestions,
  type DomainInfo,
  type QuestionExposure,
  type QuestionForSelection,
} from "@/lib/domain/exam/questionSelector";

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

  it("omitting exposure behaves exactly as before it existed", () => {
    const pool = makePool();
    const withDefault = selectExamQuestions(DOMAINS, pool, 48, seededRng(7));
    const withEmptyMap = selectExamQuestions(DOMAINS, pool, 48, seededRng(7), new Map());
    expect(withDefault).toEqual(withEmptyMap);
  });
});

describe("selectExamQuestions exposure ranking", () => {
  // One thin domain (2 questions, both target-worthy) makes the preference
  // observable without needing a full 48-question draw.
  const SMALL_DOMAINS: DomainInfo[] = [{ code: "x", title: "X", weight: 1, chapterNumbers: [1] }];
  const SMALL_POOL: QuestionForSelection[] = [
    { id: "seen-once-recent", chapterNumber: 1 },
    { id: "seen-once-stale", chapterNumber: 1 },
    { id: "seen-twice", chapterNumber: 1 },
    { id: "never-seen-a", chapterNumber: 1 },
    { id: "never-seen-b", chapterNumber: 1 },
  ];

  function exposureMap(entries: [string, QuestionExposure][]): Map<string, QuestionExposure> {
    return new Map(entries);
  }

  it("prefers never-seen questions over any that have been shown before", () => {
    // Every id in SMALL_POOL needs an explicit entry here — an id with no
    // entry defaults to timesSeen: 0, which would silently tie it with the
    // "never-seen" candidates this test is trying to keep out of the way.
    const exposure = exposureMap([
      ["seen-once-recent", { timesSeen: 1, lastSeenAtMs: Date.now() }],
      ["seen-once-stale", { timesSeen: 1, lastSeenAtMs: Date.now() }],
      ["seen-twice", { timesSeen: 2, lastSeenAtMs: Date.now() }],
    ]);

    const selection = selectExamQuestions(SMALL_DOMAINS, SMALL_POOL, 2, seededRng(1), exposure);
    const ids = new Set(selection.map((s) => s.questionId));

    expect(ids.has("never-seen-a")).toBe(true);
    expect(ids.has("never-seen-b")).toBe(true);
  });

  it("among questions seen equally often, prefers the one seen longest ago", () => {
    const dayMs = 86_400_000;
    const now = Date.now();
    // A pool of exactly the two candidates under test, rather than filtering
    // SMALL_POOL down — reusing it left "seen-twice" in scope with no entry
    // of its own, which defaulted it to timesSeen: 0 and let it win on that
    // basis alone, regardless of what this test was actually comparing.
    const pool: QuestionForSelection[] = [
      { id: "seen-once-recent", chapterNumber: 1 },
      { id: "seen-once-stale", chapterNumber: 1 },
    ];
    const exposure = exposureMap([
      ["seen-once-recent", { timesSeen: 1, lastSeenAtMs: now - dayMs }],
      ["seen-once-stale", { timesSeen: 1, lastSeenAtMs: now - 30 * dayMs }],
    ]);

    const selection = selectExamQuestions(SMALL_DOMAINS, pool, 1, seededRng(2), exposure);

    expect(selection[0].questionId).toBe("seen-once-stale");
  });

  it("still fills the target from repeats once the unseen pool is exhausted", () => {
    const exposure = exposureMap([
      ["never-seen-a", { timesSeen: 1, lastSeenAtMs: Date.now() }],
      ["never-seen-b", { timesSeen: 1, lastSeenAtMs: Date.now() }],
      ["seen-once-recent", { timesSeen: 1, lastSeenAtMs: Date.now() }],
      ["seen-once-stale", { timesSeen: 1, lastSeenAtMs: Date.now() }],
      ["seen-twice", { timesSeen: 1, lastSeenAtMs: Date.now() }],
    ]);

    // Every question has now been "seen" — the pool is fully exhausted, but
    // the exam still has to seat a full attempt.
    const selection = selectExamQuestions(SMALL_DOMAINS, SMALL_POOL, 5, seededRng(3), exposure);
    expect(selection).toHaveLength(5);
  });

  it("still shuffles among equally unseen candidates rather than always picking the same one", () => {
    const pool: QuestionForSelection[] = Array.from({ length: 8 }, (_, i) => ({
      id: `q${i}`,
      chapterNumber: 1,
    }));

    const firstPicks = new Set(
      Array.from({ length: 6 }, (_, seed) =>
        selectExamQuestions(SMALL_DOMAINS, pool, 1, seededRng(seed))[0].questionId
      )
    );

    expect(firstPicks.size).toBeGreaterThan(1);
  });
});
