"use client";

import type { QuizChoice } from "@/lib/quiz/types";

export function ChoiceList({
  choices,
  isMultiSelect,
  selectedIds,
  onChange,
  disabled,
  correctChoiceIds,
  groupLabel,
}: {
  choices: QuizChoice[];
  isMultiSelect: boolean;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** When set, renders in review mode: highlights correct vs. incorrectly-selected choices. */
  correctChoiceIds?: string[];
  /** Names the group of choices for assistive tech (the stem is separate markup). */
  groupLabel?: string;
}) {
  const toggle = (id: string) => {
    if (disabled) return;
    if (isMultiSelect) {
      onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    } else {
      onChange([id]);
    }
  };

  return (
    // fieldset/legend so the choices are announced as one named group rather
    // than as a run of unrelated radios; the legend is visually hidden because
    // the question stem above already says the same thing on screen.
    <fieldset className="space-y-2" disabled={disabled}>
      {groupLabel && <legend className="sr-only">{groupLabel}</legend>}
      {choices.map((choice) => {
        const checked = selectedIds.includes(choice.id);
        const isCorrectChoice = correctChoiceIds?.includes(choice.id);

        let stateClass = "border-border hover:bg-surface-hover";
        if (correctChoiceIds) {
          if (isCorrectChoice) {
            stateClass = "border-success-400 bg-success-50 dark:border-success-500 dark:bg-success-900/40";
          } else if (checked) {
            stateClass = "border-danger-400 bg-danger-50 dark:border-danger-500 dark:bg-danger-900/40";
          } else {
            stateClass = "border-border";
          }
        } else if (checked) {
          stateClass = "border-brand-500 bg-brand-50 dark:bg-brand-950/40";
        }

        return (
          <label
            key={choice.id}
            className={`flex items-start gap-3 rounded-md border p-3 text-sm transition-colors duration-150 ${disabled ? "" : "cursor-pointer"} ${stateClass}`}
          >
            <input
              type={isMultiSelect ? "checkbox" : "radio"}
              checked={checked}
              onChange={() => toggle(choice.id)}
              disabled={disabled}
              className="mt-0.5 accent-brand-600"
            />
            <span className="text-foreground">
              <span className="font-medium">{choice.label}.</span>{" "}
              {/* In review mode correct/incorrect is otherwise conveyed by
                  colour alone, which neither screen readers nor colour-blind
                  readers can act on. */}
              {correctChoiceIds && (isCorrectChoice || checked) && (
                <span className="sr-only">
                  {isCorrectChoice
                    ? checked
                      ? "Correct answer, which you chose."
                      : "Correct answer."
                    : "You chose this. Incorrect."}
                </span>
              )}
              {/* Choice bodies carry markup (<code> for CLI commands, <i> for
                  bit patterns) and are sanitized at ingestion by the same
                  sanitizeChapterHtml call as the question stem — rendering
                  them as text showed the raw tags to the reader. */}
              <span
                className="[&_code]:rounded [&_code]:bg-surface-hover [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]"
                dangerouslySetInnerHTML={{ __html: choice.body }}
              />
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
