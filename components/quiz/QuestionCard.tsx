"use client";

import { CircleCheck, CircleX, Layers } from "lucide-react";
import type { QuizChoice } from "@/lib/quiz/types";
import { ChoiceList } from "./ChoiceList";
import { Badge } from "@/components/ui/Badge";

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
    <div className="surface-card rounded-2xl p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="tabular text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Question {index + 1}
          <span className="text-muted-foreground/60"> / {total}</span>
        </span>
        {isMultiSelect && (
          <Badge variant="signal">
            <Layers className="h-3 w-3" aria-hidden="true" />
            Select all that apply
          </Badge>
        )}
      </div>

      <div
        className="prose prose-slate dark:prose-invert prose-p:my-1.5 mb-5 max-w-none text-fluid-base"
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
          data-answer-state={review.isCorrect ? "right" : "wrong"}
          className={`mt-5 overflow-hidden rounded-xl border ${
            review.isCorrect
              ? "animate-pop border-success-300 bg-success-50 dark:border-success-500/50 dark:bg-success-500/10"
              : "animate-shake border-danger-300 bg-danger-50 dark:border-danger-500/50 dark:bg-danger-500/10"
          }`}
        >
          <div
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold ${
              review.isCorrect
                ? "bg-success-100/70 text-success-800 dark:bg-success-500/10 dark:text-success-200"
                : "bg-danger-100/70 text-danger-800 dark:bg-danger-500/10 dark:text-danger-200"
            }`}
          >
            {review.isCorrect ? (
              <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <CircleX className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {review.isCorrect ? "Correct" : "Incorrect"}
          </div>
          <div
            className="prose prose-sm dark:prose-invert max-w-none px-4 py-3 text-foreground"
            dangerouslySetInnerHTML={{ __html: review.explanation }}
          />
        </div>
      )}
    </div>
  );
}
