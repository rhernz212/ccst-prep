export interface ExamChoice {
  id: string;
  label: string;
  body: string;
}

export interface ExamQuestion {
  id: string;
  stem: string;
  isMultiSelect: boolean;
  choices: ExamChoice[];
}

export interface ExamSubmission {
  questionId: string;
  selectedChoiceIds: string[];
}

export interface DomainBreakdownEntry {
  domainCode: string;
  domainTitle: string;
  correct: number;
  total: number;
}

export interface ExamResult {
  overall: number;
  correctCount: number;
  totalCount: number;
  byDomain: DomainBreakdownEntry[];
  status: "submitted" | "timed_out";
}
