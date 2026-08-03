import type { DomainBreakdownEntry } from "./scoring";

export interface AttemptSummary {
  score: number;
  domainBreakdown: DomainBreakdownEntry[];
}

export interface DomainPerformance {
  domainCode: string;
  domainTitle: string;
  correct: number;
  total: number;
  /** correct/total across every attempt, 0-1. */
  ratio: number;
}

export interface AttemptTrend {
  attemptCount: number;
  best: number;
  latest: number;
  /** latest minus the one before it; null when there's nothing to compare against. */
  delta: number | null;
}

/**
 * Rolls per-domain counts up across every finished attempt, weakest first.
 *
 * Aggregating rather than reading the most recent attempt matters: a single
 * sitting puts only a handful of questions in each domain, so one unlucky
 * domain looks catastrophic. Summing across attempts is what makes "this is
 * the area to study" trustworthy.
 */
export function aggregateDomainPerformance(attempts: AttemptSummary[]): DomainPerformance[] {
  const totals = new Map<string, DomainPerformance>();

  for (const attempt of attempts) {
    for (const d of attempt.domainBreakdown) {
      const entry = totals.get(d.domainCode) ?? {
        domainCode: d.domainCode,
        domainTitle: d.domainTitle,
        correct: 0,
        total: 0,
        ratio: 0,
      };
      entry.correct += d.correct;
      entry.total += d.total;
      totals.set(d.domainCode, entry);
    }
  }

  return [...totals.values()]
    .filter((d) => d.total > 0)
    .map((d) => ({ ...d, ratio: d.correct / d.total }))
    .sort((a, b) => a.ratio - b.ratio || a.domainCode.localeCompare(b.domainCode));
}

/** Summarizes a newest-first list of attempts. Returns null for an empty list. */
export function summarizeTrend(attempts: AttemptSummary[]): AttemptTrend | null {
  if (attempts.length === 0) return null;

  const [latest, previous] = attempts;
  return {
    attemptCount: attempts.length,
    best: Math.max(...attempts.map((a) => a.score)),
    latest: latest.score,
    delta: previous ? latest.score - previous.score : null,
  };
}
