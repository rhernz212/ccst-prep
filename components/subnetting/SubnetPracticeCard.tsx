"use client";

import { useEffect, useState } from "react";
import { generateProblem, type SubnettingProblem } from "@/lib/domain/subnetting/problemGenerator";
import {
  gradeRangeProblem,
  gradeMaskForHostsProblem,
  type RangeAnswerInput,
} from "@/lib/domain/subnetting/grader";

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
      <div className="rounded-lg border border-gray-200 p-5 text-sm text-gray-500">
        Loading practice problem…
      </div>
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
    <div className="rounded-lg border border-gray-200 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Practice Problem</h3>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => {
              const d = Number(e.target.value);
              setDifficulty(d);
              nextProblem(d);
            }}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mb-4 text-sm text-gray-800">{problem.prompt}</p>

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
          className={`mt-4 rounded-md border p-3 text-sm ${
            isCorrect
              ? "border-green-300 bg-green-50 text-green-900"
              : "border-red-300 bg-red-50 text-red-900"
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
          <button
            type="button"
            onClick={() => setChecked(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Check Answer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => nextProblem()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Next Problem
          </button>
        )}
      </div>
    </div>
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
  let borderClass = "border-gray-300";
  if (correct === true) borderClass = "border-green-500 bg-green-50";
  if (correct === false) borderClass = "border-red-500 bg-red-50";

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`mt-1 w-full rounded-md border px-2 py-1.5 font-mono text-sm ${borderClass}`}
      />
    </div>
  );
}
