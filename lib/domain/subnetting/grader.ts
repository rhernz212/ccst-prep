import { maskToCidr } from "./ipv4";
import type { MaskForHostsProblem, RangeProblem } from "./problemGenerator";

/** Accepts "/24", "24", or "255.255.255.0" interchangeably. Returns null if unparseable. */
export function normalizeCidrOrMask(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed.startsWith("/")) {
    const n = Number(trimmed.slice(1));
    return Number.isInteger(n) && n >= 0 && n <= 32 ? n : null;
  }
  if (/^\d{1,2}$/.test(trimmed)) {
    const n = Number(trimmed);
    return n >= 0 && n <= 32 ? n : null;
  }
  try {
    return maskToCidr(trimmed);
  } catch {
    return null;
  }
}

export interface RangeAnswerInput {
  network?: string;
  broadcast?: string;
  firstHost?: string;
  lastHost?: string;
  hostCount?: string;
}

export interface RangeGradeResult {
  correct: boolean;
  fields: {
    network: boolean;
    broadcast: boolean;
    firstHost: boolean;
    lastHost: boolean;
    hostCount: boolean;
  };
}

export function gradeRangeProblem(problem: RangeProblem, userAnswer: RangeAnswerInput): RangeGradeResult {
  const a = problem.answer;
  const fields = {
    network: (userAnswer.network ?? "").trim() === a.network,
    broadcast: (userAnswer.broadcast ?? "").trim() === a.broadcast,
    firstHost: (userAnswer.firstHost ?? "").trim() === (a.firstHost ?? ""),
    lastHost: (userAnswer.lastHost ?? "").trim() === (a.lastHost ?? ""),
    hostCount: Number((userAnswer.hostCount ?? "").trim()) === a.hostCount,
  };
  return { correct: Object.values(fields).every(Boolean), fields };
}

export function gradeMaskForHostsProblem(problem: MaskForHostsProblem, userAnswer: string): boolean {
  const cidr = normalizeCidrOrMask(userAnswer);
  return cidr !== null && cidr === problem.answerCidr;
}
