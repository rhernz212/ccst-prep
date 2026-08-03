"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { QuizChoice } from "@/lib/quiz/types";
import { ChoiceList } from "./ChoiceList";

export interface ReviewInfo {
  isCorrect: boolean;
  correctChoiceIds: string[];
  explanation: string;
}

export function QuestionCard({
  index,
  total,
  stem,
  choices,
  isMultiSelect,
  selectedIds,
  onChange,
  review,
}: {
  index: number;
  total: number;
  stem: string;
  choices: QuizChoice[];
  isMultiSelect: boolean;
  selectedIds: string[];
  /**
   * Optional so read-only review usage (e.g. exam results, rendered from a
   * Server Component) never needs to pass a function prop — functions can't
   * cross the server->client props boundary.
   */
  onChange?: (ids: string[]) => void;
  review?: ReviewInfo;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-muted-foreground">
        Question {index + 1} of {total}
        {isMultiSelect && (
          <span className="ml-2 text-brand-600 dark:text-brand-400">(Select all that apply)</span>
        )}
      </div>
      <div
        className="prose prose-slate dark:prose-invert prose-p:my-1 mb-4 max-w-none"
        dangerouslySetInnerHTML={{ __html: stem }}
      />
      <ChoiceList
        choices={choices}
        isMultiSelect={isMultiSelect}
        selectedIds={selectedIds}
        onChange={onChange ?? (() => {})}
        disabled={!!review}
        correctChoiceIds={review?.correctChoiceIds}
        groupLabel={`Question ${index + 1}${isMultiSelect ? ", select all that apply" : ""}`}
      />
      {review && (
        <div
          key={review.isCorrect ? "correct" : "incorrect"}
          // Grading feedback appears without any navigation, so it needs to be
          // announced — otherwise a screen-reader user gets no signal that
          // their answer was judged at all.
          role="status"
          className={`mt-4 flex items-start gap-2 rounded-md border p-3 text-sm ${
            review.isCorrect
              ? "border-success-300 bg-success-50 text-success-900 animate-pop dark:border-success-600 dark:bg-success-900/40 dark:text-success-100"
              : "border-danger-300 bg-danger-50 text-danger-900 animate-shake dark:border-danger-600 dark:bg-danger-900/40 dark:text-danger-100"
          }`}
        >
          {review.isCorrect ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div>
            <div className="mb-1 font-medium">{review.isCorrect ? "Correct" : "Incorrect"}</div>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: review.explanation }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
