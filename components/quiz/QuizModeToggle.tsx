"use client";

import { GraduationCap, Lightbulb, type LucideIcon } from "lucide-react";

export type QuizMode = "practice" | "test";

const MODES: { value: QuizMode; label: string; hint: string; icon: LucideIcon }[] = [
  {
    value: "practice",
    label: "Practice",
    hint: "Check each answer as you go",
    icon: Lightbulb,
  },
  {
    value: "test",
    label: "Test",
    hint: "Answer everything, score at the end",
    icon: GraduationCap,
  },
];

export function QuizModeToggle({
  mode,
  onChange,
}: {
  mode: QuizMode;
  onChange: (mode: QuizMode) => void;
}) {
  const active = MODES.find((m) => m.value === mode);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div
        role="radiogroup"
        aria-label="Quiz mode"
        className="inline-flex rounded-xl border border-border bg-surface-sunken p-1"
      >
        {MODES.map((m) => {
          const Icon = m.icon;
          const selected = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(m.value)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-200 ease-[var(--ease-spring)] active:scale-[0.97] ${
                selected
                  ? "surface-card text-brand-700 dark:text-brand-300"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {m.label}
            </button>
          );
        })}
      </div>
      {active && <p className="text-xs text-muted-foreground">{active.hint}</p>}
    </div>
  );
}
