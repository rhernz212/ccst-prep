export interface AttemptResponse {
  questionId: string;
  isCorrect: boolean;
  domainCode: string | null;
}

export interface DomainBreakdownEntry {
  domainCode: string;
  domainTitle: string;
  correct: number;
  total: number;
}

export interface ExamScore {
  overall: number;
  correctCount: number;
  totalCount: number;
  byDomain: DomainBreakdownEntry[];
}

export function scoreAttempt(
  responses: AttemptResponse[],
  domains: { code: string; title: string }[]
): ExamScore {
  const byDomainMap = new Map<string, DomainBreakdownEntry>();
  for (const d of domains) {
    byDomainMap.set(d.code, { domainCode: d.code, domainTitle: d.title, correct: 0, total: 0 });
  }

  let correctCount = 0;
  for (const r of responses) {
    if (r.isCorrect) correctCount++;
    if (r.domainCode) {
      const entry = byDomainMap.get(r.domainCode);
      if (entry) {
        entry.total++;
        if (r.isCorrect) entry.correct++;
      }
    }
  }

  return {
    overall: responses.length > 0 ? correctCount / responses.length : 0,
    correctCount,
    totalCount: responses.length,
    byDomain: [...byDomainMap.values()].filter((d) => d.total > 0),
  };
}
