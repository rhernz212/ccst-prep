"use client";

import { useEffect, useState } from "react";
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
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Practice Problem</h3>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => {
              const d = Number(e.target.value);
              setDifficulty(d);
              nextProblem(d);
            }}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground dark:bg-surface"
          >
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-4 text-sm text-foreground">{problem.prompt}</p>

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
          className={`mt-4 rounded-md border p-3 text-sm ${
            isCorrect
              ? "border-success-300 bg-success-50 text-success-900 animate-pop dark:border-success-600 dark:bg-success-900/40 dark:text-success-100"
              : "border-danger-300 bg-danger-50 text-danger-900 animate-shake dark:border-danger-600 dark:bg-danger-900/40 dark:text-danger-100"
          }`}
        >
          {isCorrect ? (
            "Correct!"
          ) : problem.kind === "find-range" ? (
            <>
              Network {problem.answer.network}, broadcast {problem.answer.broadcast}, usable range{" "}
              {problem.answer.firstHost ?? "—"}–{problem.answer.lastHost ?? "—"} (
              {problem.answer.hostCount} hosts).
            </>
          ) : (
            <>
              Correct answer: {problem.answerMask} (/{problem.answerCidr})
            </>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        {!checked ? (
          <Button onClick={() => setChecked(true)}>Check Answer</Button>
        ) : (
          <Button onClick={() => nextProblem()}>Next Problem</Button>
        )}
      </div>
    </Card>
  );
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
  let stateClass = "border-border bg-background dark:bg-surface";
  if (correct === true) {
    stateClass = "border-success-500 bg-success-50 dark:bg-success-900/40";
  }
  if (correct === false) {
    stateClass = "border-danger-500 bg-danger-50 dark:bg-danger-900/40";
  }

  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`mt-1 w-full rounded-md border px-2 py-1.5 font-mono text-sm text-foreground transition-colors disabled:opacity-80 ${stateClass}`}
      />
    </div>
  );
}
