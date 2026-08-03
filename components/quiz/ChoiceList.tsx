"use client";

import { Check, X } from "lucide-react";
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
    <fieldset className="space-y-2.5" disabled={disabled}>
      {groupLabel && <legend className="sr-only">{groupLabel}</legend>}
      {choices.map((choice) => {
        const checked = selectedIds.includes(choice.id);
        const isCorrectChoice = correctChoiceIds?.includes(choice.id);

        // One of: "idle" | "picked" | "right" | "wrong" | "missed". Driving
        // the styling off a single state name keeps the tile, the letter chip
        // and the trailing icon from drifting out of sync with each other.
        const state = correctChoiceIds
          ? isCorrectChoice
            ? checked
              ? "right"
              : "missed"
            : checked
              ? "wrong"
              : "idle"
          : checked
            ? "picked"
            : "idle";

        const tileClass = {
          idle: "border-border bg-surface hover:border-brand-300 hover:bg-surface-hover dark:hover:border-brand-500/60",
          picked: "border-brand-500 bg-brand-50 shadow-sm dark:bg-brand-500/15",
          right: "border-success-400 bg-success-50 dark:border-success-500/70 dark:bg-success-500/15",
          missed:
            "border-success-300 border-dashed bg-success-50/60 dark:border-success-500/50 dark:bg-success-500/10",
          wrong: "border-danger-400 bg-danger-50 dark:border-danger-500/70 dark:bg-danger-500/15",
        }[state];

        const chipClass = {
          idle: "border-border-strong text-muted-foreground",
          picked: "border-brand-500 bg-brand-500 text-white",
          right: "border-success-500 bg-success-500 text-white",
          missed: "border-success-400 text-success-700 dark:text-success-300",
          wrong: "border-danger-500 bg-danger-500 text-white",
        }[state];

        return (
          // The radio itself is visually hidden, so its focus ring would be
          // too — has-[:focus-visible] moves the ring onto the tile the
          // keyboard user is actually looking at.
          <label
            key={choice.id}
            data-answer-state={state}
            className={`flex items-start gap-3 rounded-xl border p-3.5 text-sm transition-[background-color,border-color,box-shadow,transform] duration-200 ease-[var(--ease-spring)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring ${
              disabled ? "" : "cursor-pointer active:scale-[0.99] active:duration-75"
            } ${tileClass}`}
          >
            {/* The native control is the accessible one and stays in the tab
                order and the a11y tree; the letter chip beside it is the
                visible affordance, which a raw radio can't be styled into. */}
            <input
              type={isMultiSelect ? "checkbox" : "radio"}
              checked={checked}
              onChange={() => toggle(choice.id)}
              disabled={disabled}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`grid h-7 w-7 shrink-0 place-items-center border text-xs font-bold transition-colors duration-200 ${chipClass} ${
                isMultiSelect ? "rounded-md" : "rounded-full"
              }`}
            >
              {state === "right" ? (
                <Check className="h-4 w-4" strokeWidth={3} />
              ) : state === "wrong" ? (
                <X className="h-4 w-4" strokeWidth={3} />
              ) : (
                choice.label
              )}
            </span>

            <span className="min-w-0 flex-1 pt-0.5 text-foreground">
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
