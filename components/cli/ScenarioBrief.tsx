"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/domain/cli-sim/scenarios";

export function ScenarioBrief({
  scenario,
  requiredCommandRun,
  onNext,
}: {
  scenario: Scenario;
  requiredCommandRun: boolean;
  onNext: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);

  function checkAnswer() {
    const correct = answer.trim().toLowerCase() === scenario.expectedAnswer.trim().toLowerCase();
    setResult(correct ? "correct" : "incorrect");
  }

  function handleNext() {
    setAnswer("");
    setResult(null);
    onNext();
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 p-4">
      <div className="text-sm font-medium text-gray-900">{scenario.prompt}</div>
      {scenario.requiredCommand && !requiredCommandRun && (
        <p className="mt-1 text-xs text-amber-600">
          Run the right command in the terminal below first, then type your answer.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!requiredCommandRun}
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:bg-gray-50"
          placeholder="Your answer"
        />
        <button
          type="button"
          onClick={checkAnswer}
          disabled={!requiredCommandRun || !answer.trim()}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Check Answer
        </button>
        <button type="button" onClick={handleNext} className="text-sm text-gray-500 hover:underline">
          Skip
        </button>
      </div>
      {result && (
        <p className={`mt-2 text-sm ${result === "correct" ? "text-green-700" : "text-red-700"}`}>
          {result === "correct" ? "Correct!" : `Not quite. The correct answer was "${scenario.expectedAnswer}".`}
        </p>
      )}
      {result === "correct" && (
        <button
          type="button"
          onClick={handleNext}
          className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Next Scenario
        </button>
      )}
    </div>
  );
}
