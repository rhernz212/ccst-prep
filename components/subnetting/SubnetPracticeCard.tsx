"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CircleCheck, CircleX, Dumbbell } from "lucide-react";
import { generateProblem, type SubnettingProblem } from "@/lib/domain/subnetting/problemGenerator";
import {
  gradeRangeProblem,
  gradeMaskForHostsProblem,
  type RangeAnswerInput,
} from "@/lib/domain/subnetting/grader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function SubnetPracticeCard() {
  const [difficulty, setDifficulty] = useState(3);
  // Generated client-side only (in an effect, not initial state) — problem
  // generation uses Math.random(), and seeding it into useState's initial
  // value would make the server-rendered HTML disagree with the client's
  // first render, causing a hydration mismatch.
  const [problem, setProblem] = useState<SubnettingProblem | null>(null);
  const [rangeAnswer, setRangeAnswer] = useState<RangeAnswerInput>({});
  const [maskAnswer, setMaskAnswer] = useState("");
  const [checked, setChecked] = useState(false);

  // Deliberate one-time client-only setState: generateProblem() uses
  // Math.random(), so seeding it as this state's initial value would make
  // the server-rendered HTML disagree with the client's first render.
  // Only runs once on mount — difficulty changes go through nextProblem().
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProblem(generateProblem(difficulty));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function nextProblem(newDifficulty = difficulty) {
    setProblem(generateProblem(newDifficulty));
    setRangeAnswer({});
    setMaskAnswer("");
    setChecked(false);
  }

  if (!problem) {
    return (
      <Card className="p-5 text-sm text-muted-foreground">Loading practice problem…</Card>
    );
  }

  const rangeResult =
    problem.kind === "find-range" && checked ? gradeRangeProblem(problem, rangeAnswer) : null;
  const maskCorrect =
    problem.kind === "find-mask-for-hosts" && checked
      ? gradeMaskForHostsProblem(problem, maskAnswer)
      : null;
  const isCorrect = problem.kind === "find-range" ? rangeResult?.correct : maskCorrect;

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
            aria-hidden="true"
          >
            <Dumbbell className="h-5 w-5" />
          </span>
          <h3 className="text-fluid-lg font-semibold text-foreground">Practice problem</h3>
        </div>

        {/* Difficulty as five taps rather than a select: it's the one control
            on this card people change often, and a native picker on a phone is
            a full-screen sheet for what should be a single tap. */}
        <div
          role="radiogroup"
          aria-label="Difficulty"
          className="inline-flex items-center gap-1.5"
        >
          <span className="mr-0.5 text-xs font-medium text-muted-foreground">Difficulty</span>
          {[1, 2, 3, 4, 5].map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={difficulty === d}
              aria-label={`Difficulty ${d}`}
              onClick={() => {
                setDifficulty(d);
                nextProblem(d);
              }}
              className={`tabular grid h-8 w-8 place-items-center rounded-lg text-xs font-bold transition-[background-color,color,transform] duration-150 ease-[var(--ease-spring)] active:scale-90 ${
                difficulty === d
                  ? "bg-brand-600 text-white shadow-raised"
                  : "bg-surface-hover text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-5 rounded-xl border border-border bg-surface-sunken p-3.5 text-sm text-foreground">
        {problem.prompt}
      </p>

      {problem.kind === "find-range" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <AnswerField
            label="Network"
            value={rangeAnswer.network ?? ""}
            onChange={(v) => setRangeAnswer((p) => ({ ...p, network: v }))}
            correct={rangeResult?.fields.network}
            disabled={checked}
          />
          <AnswerField
            label="Broadcast"
            value={rangeAnswer.broadcast ?? ""}
            onChange={(v) => setRangeAnswer((p) => ({ ...p, broadcast: v }))}
            correct={rangeResult?.fields.broadcast}
            disabled={checked}
          />
          <AnswerField
            label="First host"
            value={rangeAnswer.firstHost ?? ""}
            onChange={(v) => setRangeAnswer((p) => ({ ...p, firstHost: v }))}
            correct={rangeResult?.fields.firstHost}
            disabled={checked}
          />
          <AnswerField
            label="Last host"
            value={rangeAnswer.lastHost ?? ""}
            onChange={(v) => setRangeAnswer((p) => ({ ...p, lastHost: v }))}
            correct={rangeResult?.fields.lastHost}
            disabled={checked}
          />
          <AnswerField
            label="Usable hosts"
            value={rangeAnswer.hostCount ?? ""}
            onChange={(v) => setRangeAnswer((p) => ({ ...p, hostCount: v }))}
            correct={rangeResult?.fields.hostCount}
            disabled={checked}
          />
        </div>
      ) : (
        <div className="max-w-xs">
          <AnswerField
            label="Subnet mask (or CIDR)"
            value={maskAnswer}
            onChange={setMaskAnswer}
            correct={checked ? (maskCorrect ?? false) : undefined}
            disabled={checked}
          />
        </div>
      )}

      {checked && (
        <div
          key={isCorrect ? "correct" : "incorrect"}
          role="status"
          data-answer-state={isCorrect ? "right" : "wrong"}
          className={`mt-5 flex items-start gap-2 rounded-xl border p-3.5 text-sm ${
            isCorrect
              ? "animate-pop border-success-300 bg-success-50 text-success-800 dark:border-success-500/50 dark:bg-success-500/10 dark:text-success-200"
              : "animate-shake border-danger-300 bg-danger-50 text-danger-800 dark:border-danger-500/50 dark:bg-danger-500/10 dark:text-danger-200"
          }`}
        >
          {isCorrect ? (
            <CircleCheck className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CircleX className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0">
            {isCorrect ? (
              "Correct!"
            ) : problem.kind === "find-range" ? (
              <>
                Network <Answer>{problem.answer.network}</Answer>, broadcast{" "}
                <Answer>{problem.answer.broadcast}</Answer>, usable range{" "}
                <Answer>{problem.answer.firstHost ?? "—"}</Answer>–
                <Answer>{problem.answer.lastHost ?? "—"}</Answer> ({problem.answer.hostCount}{" "}
                hosts).
              </>
            ) : (
              <>
                Correct answer: <Answer>{problem.answerMask}</Answer> (/{problem.answerCidr})
              </>
            )}
          </span>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {!checked ? (
          <Button onClick={() => setChecked(true)}>Check answer</Button>
        ) : (
          <Button onClick={() => nextProblem()}>
            Next problem
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </Card>
  );
}

/** Monospaces the addresses inside the feedback prose so octets line up. */
function Answer({ children }: { children: React.ReactNode }) {
  return <span className="tabular font-mono font-semibold">{children}</span>;
}

function AnswerField({
  label,
  value,
  onChange,
  correct,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  correct?: boolean;
  disabled?: boolean;
}) {
  let stateClass = "border-border bg-surface dark:bg-surface-sunken";
  if (correct === true) {
    stateClass = "border-success-500 bg-success-50 dark:bg-success-500/15";
  }
  if (correct === false) {
    stateClass = "border-danger-500 bg-danger-50 dark:bg-danger-500/15";
  }

  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        {correct === true && (
          <CircleCheck className="h-3 w-3 text-success-600 dark:text-success-400" aria-label="Correct" />
        )}
        {correct === false && (
          <CircleX className="h-3 w-3 text-danger-600 dark:text-danger-400" aria-label="Incorrect" />
        )}
      </label>
      {/* text-base below sm so iOS Safari doesn't zoom the page on focus —
          which on this card would scroll the rest of the answer grid away
          mid-entry. */}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        inputMode="decimal"
        data-answer-state={correct === undefined ? "idle" : correct ? "right" : "wrong"}
        className={`tabular mt-1.5 h-11 w-full rounded-lg border px-2.5 font-mono text-base text-foreground transition-colors duration-200 focus:outline-none disabled:opacity-90 sm:text-sm ${stateClass}`}
      />
    </div>
  );
}
