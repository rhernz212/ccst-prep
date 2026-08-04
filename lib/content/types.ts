/**
 * Practice tools that aren't derived from a book's content, so they only
 * apply to exams that actually test the skill. Everything else (study,
 * quizzes, review, exam) follows from the ingested content and is always
 * present.
 */
export type ExamTool = "subnetting" | "cli";

export interface ExamMeta {
  slug: string;
  title: string;
  vendor: string;
  examCode: string;
  timeLimitMinutes: number;
  questionCount: number;
  /** Optional tool tabs to offer. Omitted means all of them. */
  tools?: ExamTool[];
  /**
   * Readiness target as a 0-1 fraction, used to label practice attempts
   * "on target" or "keep practicing". Deliberately not called a passing
   * score: Cisco does not publish a cut score for the CCST exams, so this
   * is a study goal you can tune per exam, not the real threshold.
   */
  targetScore?: number;
}

export interface ChapterSection {
  anchorId: string;
  title: string;
  order: number;
  html: string;
  isReviewQuestions: boolean;
}

export interface Chapter {
  slug: string;
  number: number;
  title: string;
  /** Intro content before the first named (h2) section — topic checklist, opening paragraphs. */
  introHtml: string;
  sections: ChapterSection[];
}

export interface NavSection {
  anchorId: string;
  title: string;
  order: number;
}

export interface NavChapter {
  number: number;
  slug: string;
  title: string;
  sourceFile: string;
  sections: NavSection[];
}

export interface BlueprintObjective {
  code: string;
  title: string;
  chapterRefs: number[];
  contentExamples: string[];
}

export interface BlueprintDomain {
  code: string;
  title: string;
  objectives: BlueprintObjective[];
  weight: number;
}

export interface Blueprint {
  weightingMethod: string;
  domains: BlueprintDomain[];
}

export interface QuestionChoice {
  label: string;
  body: string;
  isCorrect: boolean;
}

export interface QuestionBankEntry {
  chapterNumber: number;
  /** 1-based position within that chapter's Review Questions — also the natural key used to re-seed idempotently. */
  ordinal: number;
  domainCode: string | null;
  stem: string;
  explanation: string;
  isMultiSelect: boolean;
  choices: QuestionChoice[];
}
