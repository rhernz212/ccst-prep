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
 */
export function selectExamQuestions(
  domains: DomainInfo[],
  questionPool: QuestionForSelection[],
  targetCount: number,
  rng: () => number = Math.random
): SelectedQuestion[] {
  const targets = computeDomainTargets(domains, targetCount);
  const selected = new Set<string>();
  const result: SelectedQuestion[] = [];

  for (const domain of domains) {
    const target = targets.get(domain.code) ?? 0;
    if (target === 0) continue;

    const candidates = shuffle(
      questionPool.filter((q) => domain.chapterNumbers.includes(q.chapterNumber) && !selected.has(q.id)),
      rng
    );
    for (const q of candidates.slice(0, target)) {
      selected.add(q.id);
      result.push({ questionId: q.id, domainCode: domain.code });
    }
  }

  const shortfall = targetCount - result.length;
  if (shortfall > 0) {
    const backfillCandidates = shuffle(
      questionPool.filter((q) => !selected.has(q.id)),
      rng
    );
    for (const q of backfillCandidates.slice(0, shortfall)) {
      selected.add(q.id);
      result.push({ questionId: q.id, domainCode: null });
    }
  }

  return shuffle(result, rng);
}
