"use client";

import type { QuizChoice } from "@/lib/quiz/types";

export function ChoiceList({
  choices,
  isMultiSelect,
  selectedIds,
  onChange,
  disabled,
  correctChoiceIds,
}: {
  choices: QuizChoice[];
  isMultiSelect: boolean;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** When set, renders in review mode: highlights correct vs. incorrectly-selected choices. */
  correctChoiceIds?: string[];
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
    <div className="space-y-2">
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
              <span className="font-medium">{choice.label}.</span> {choice.body}
            </span>
          </label>
        );
      })}
    </div>
  );
}
