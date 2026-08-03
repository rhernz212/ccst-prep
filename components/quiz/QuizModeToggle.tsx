"use client";

export type QuizMode = "practice" | "test";

const MODES: { value: QuizMode; label: string; hint: string }[] = [
  { value: "practice", label: "Practice", hint: "Check each answer as you go" },
  { value: "test", label: "Test", hint: "Answer everything, score at the end" },
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
    <div className="mb-5">
      <div
        role="radiogroup"
        aria-label="Quiz mode"
        className="inline-flex rounded-md border border-border bg-surface p-0.5"
      >
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mode === m.value}
            onClick={() => onChange(m.value)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              mode === m.value
                ? "bg-brand-600 text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {active && <p className="mt-1.5 text-xs text-muted-foreground">{active.hint}</p>}
    </div>
  );
}
