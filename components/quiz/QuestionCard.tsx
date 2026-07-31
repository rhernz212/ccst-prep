"use client";

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
      <div className="mb-2 text-sm font-medium text-gray-600">
        Question {index + 1} of {total}
        {isMultiSelect && <span className="ml-2 text-blue-600">(Select all that apply)</span>}
      </div>
      <div
        className="prose prose-slate prose-p:my-1 mb-4 max-w-none"
        dangerouslySetInnerHTML={{ __html: stem }}
      />
      <ChoiceList
        choices={choices}
        isMultiSelect={isMultiSelect}
        selectedIds={selectedIds}
        onChange={onChange ?? (() => {})}
        disabled={!!review}
        correctChoiceIds={review?.correctChoiceIds}
      />
      {review && (
        <div
          className={`mt-4 rounded-md border p-3 text-sm ${
            review.isCorrect
              ? "border-green-300 bg-green-50 text-green-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <div className="mb-1 font-medium">{review.isCorrect ? "Correct" : "Incorrect"}</div>
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: review.explanation }}
          />
        </div>
      )}
    </div>
  );
}
