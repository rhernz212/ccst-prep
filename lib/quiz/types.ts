export interface QuizChoice {
  id: string;
  label: string;
  body: string;
}

/** Client-safe shape — never carries is_correct; grading happens server-side. */
export interface QuizQuestion {
  id: string;
  stem: string;
  isMultiSelect: boolean;
  choices: QuizChoice[];
}

export interface SubmittedAnswer {
  questionId: string;
  selectedChoiceIds: string[];
}

export interface GradedAnswer {
  questionId: string;
  isCorrect: boolean;
  correctChoiceIds: string[];
  explanation: string;
}

export interface QuizResult {
  score: number;
  questionCount: number;
  graded: GradedAnswer[];
  /** false when the visitor wasn't signed in — grading still ran, but nothing was persisted. */
  saved: boolean;
}
