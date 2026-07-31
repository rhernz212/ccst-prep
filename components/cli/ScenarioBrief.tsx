"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/domain/cli-sim/scenarios";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
    <Card className="mb-4 p-4">
      <div className="text-sm font-medium text-foreground">{scenario.prompt}</div>
      {scenario.requiredCommand && !requiredCommandRun && (
        <p className="mt-1 text-xs text-warning-700 dark:text-warning-400">
          Run the right command in the terminal below first, then type your answer.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!requiredCommandRun}
          className="w-64"
          placeholder="Your answer"
        />
        <Button onClick={checkAnswer} disabled={!requiredCommandRun || !answer.trim()}>
          Check Answer
        </Button>
        <button
          type="button"
          onClick={handleNext}
          className="text-sm text-muted-foreground hover:underline"
        >
          Skip
        </button>
      </div>
      {result && (
        <p
          key={result}
          className={`mt-2 text-sm animate-fade-in ${
            result === "correct"
              ? "text-success-700 dark:text-success-400"
              : "text-danger-700 dark:text-danger-400"
          }`}
        >
          {result === "correct" ? "Correct!" : `Not quite. The correct answer was "${scenario.expectedAnswer}".`}
        </p>
      )}
      {result === "correct" && (
        <Button onClick={handleNext} className="mt-2">
          Next Scenario
        </Button>
      )}
    </Card>
  );
}
