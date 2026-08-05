export interface DomainInfo {
  code: string;
  title: string;
  weight: number;
  /** Union of chapterRefs across all of this domain's objectives. */
  chapterNumbers: number[];
}

export interface QuestionForSelection {
  id: string;
  chapterNumber: number;
}

/**
 * How much a question has already been drawn on past practice-exam
 * attempts for this user, on this exam — see selectExamQuestions.
 */
export interface QuestionExposure {
  /** Attempts (any status) whose selection included this question. */
  timesSeen: number;
  /** Epoch ms of the most recent attempt that included it. */
  lastSeenAtMs: number;
}

export interface SelectedQuestion {
  questionId: string;
  /** null only for the rare shortfall-backfill case — see selectExamQuestions. */
  domainCode: string | null;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffles, then stably sorts least-exposed-first: never-seen questions
 * before once-seen, and among equally-exposed questions the longest-ago
 * sighting first. The shuffle is what makes ties (most commonly: several
 * questions nobody has seen yet) come out in random order rather than
 * insertion order every time — the sort by itself is stable, so it never
 * reorders equal keys, it just never gets the chance to see them as unequal
 * until the shuffle has already mixed them.
 *
 * With an empty exposure map (the default, and every existing caller before
 * this), every key compares equal and the result is exactly the shuffle —
 * unchanged behavior for anyone not passing exposure data.
 */
function rankByExposure<T extends { id: string }>(
  candidates: T[],
  exposure: Map<string, QuestionExposure>,
  rng: () => number
): T[] {
  const shuffled = shuffle(candidates, rng);
  return shuffled
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ea = exposure.get(a.item.id);
      const eb = exposure.get(b.item.id);
      const countA = ea?.timesSeen ?? 0;
      const countB = eb?.timesSeen ?? 0;
      if (countA !== countB) return countA - countB;

      // Only meaningful once both have been seen at least once — an unseen
      // question has no "last seen" to compare, so ties among unseen
      // candidates fall through to the shuffle order below.
      const lastA = ea?.lastSeenAtMs ?? -Infinity;
      const lastB = eb?.lastSeenAtMs ?? -Infinity;
      if (lastA !== lastB) return lastA - lastB;

      return a.index - b.index;
    })
    .map(({ item }) => item);
}

/** Largest-remainder rounding: each domain's raw share (weight * targetCount) is
 * floored, then remaining slots go to the domains with the largest fractional
 * remainder, so the total always sums to exactly targetCount. */
function computeDomainTargets(domains: DomainInfo[], targetCount: number): Map<string, number> {
  const shares = domains.map((d) => {
    const exact = d.weight * targetCount;
    return { code: d.code, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  const targets = new Map(shares.map((s) => [s.code, s.floor]));
  const allocated = shares.reduce((sum, s) => sum + s.floor, 0);
  const remaining = targetCount - allocated;

  const byRemainderDesc = [...shares].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining; i++) {
    const code = byRemainderDesc[i % byRemainderDesc.length].code;
    targets.set(code, (targets.get(code) ?? 0) + 1);
  }
  return targets;
}

/**
 * Selects `targetCount` questions distributed across domains by weight.
 * Pools are built from chapter membership (blueprint_objectives.chapter_numbers)
 * rather than each question's precomputed domain_id — a chapter can be
 * covered by more than one domain, so questions.domain_id is only set when
 * the mapping is unambiguous (see scripts/ingest/ingest.ts), which left
 * some domains with zero directly-tagged questions. Selecting by chapter
 * membership instead means every domain gets a real candidate pool.
 *
 * If a domain's pool (excluding questions already claimed by an earlier
 * domain) is smaller than its target, the shortfall is backfilled from any
 * remaining unclaimed question in the exam — those backfilled picks carry
 * domainCode: null since they don't cleanly belong to the domain that was
 * short.
 *
 * `exposure` biases both the domain pools and the backfill pool toward
 * questions this user hasn't seen on a past attempt, or saw longest ago —
 * see rankByExposure. This is a preference, not a hard rule: a domain whose
 * unseen pool runs dry still gets filled, just with its least-recently-shown
 * repeats rather than a fresh shuffle that could hand back the exact same
 * question twice in a row. Left at its default (empty), every candidate is
 * equally eligible and this behaves exactly as before repeat suppression
 * existed.
 */
export function selectExamQuestions(
  domains: DomainInfo[],
  questionPool: QuestionForSelection[],
  targetCount: number,
  rng: () => number = Math.random,
  exposure: Map<string, QuestionExposure> = new Map()
): SelectedQuestion[] {
  const targets = computeDomainTargets(domains, targetCount);
  const selected = new Set<string>();
  const result: SelectedQuestion[] = [];

  for (const domain of domains) {
    const target = targets.get(domain.code) ?? 0;
    if (target === 0) continue;

    const candidates = rankByExposure(
      questionPool.filter((q) => domain.chapterNumbers.includes(q.chapterNumber) && !selected.has(q.id)),
      exposure,
      rng
    );
    for (const q of candidates.slice(0, target)) {
      selected.add(q.id);
      result.push({ questionId: q.id, domainCode: domain.code });
    }
  }

  const shortfall = targetCount - result.length;
  if (shortfall > 0) {
    const backfillCandidates = rankByExposure(
      questionPool.filter((q) => !selected.has(q.id)),
      exposure,
      rng
    );
    for (const q of backfillCandidates.slice(0, shortfall)) {
      selected.add(q.id);
      result.push({ questionId: q.id, domainCode: null });
    }
  }

  return shuffle(result, rng);
}
