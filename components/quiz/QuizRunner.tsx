"use client";

import { useState } from "react";
import type { QuizQuestion, QuizResult, GradedAnswer } from "@/lib/quiz/types";
import { QuestionCard } from "./QuestionCard";
import { ScoreSummary } from "./ScoreSummary";
import { QuizModeToggle, type QuizMode } from "./QuizModeToggle";
import { Button } from "@/components/ui/Button";

export function QuizRunner({
  examSlug,
  chapterId,
  chapterTitle,
  questions,
}: {
  examSlug: string;
  chapterId: string;
  chapterTitle: string;
  questions: QuizQuestion[];
}) {
  const [mode, setMode] = useState<QuizMode>("practice");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  /** Per-question feedback revealed in practice mode, keyed by question id. */
  const [checked, setChecked] = useState<Record<string, GradedAnswer>>({});
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = Object.values(answers).filter((ids) => ids.length > 0).length;
  const currentAnswer = answers[current.id] ?? [];
  const currentChecked = checked[current.id];
  const canCheck = mode === "practice" && !currentChecked && currentAnswer.length > 0;

  function reset() {
    setResult(null);
    setAnswers({});
    setChecked({});
    setIndex(0);
    setError(null);
  }

  async function handleCheck() {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/questions/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: current.id, selectedChoiceIds: currentAnswer }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to check answer");
      }
      const graded: GradedAnswer = await res.json();
      setChecked((prev) => ({ ...prev, [current.id]: graded }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedChoiceIds: answers[q.id] ?? [],
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to submit quiz");
      }
      const data: QuizResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <ScoreSummary
        examSlug={examSlug}
        chapterTitle={chapterTitle}
        result={result}
        questions={questions}
        answers={answers}
        onRetry={reset}
      />
    );
  }

  return (
    <div>
      <QuizModeToggle mode={mode} onChange={setMode} />

      <div key={current.id} className="animate-fade-in-up">
        <QuestionCard
          index={index}
          total={questions.length}
          stem={current.stem}
          choices={current.choices}
          isMultiSelect={current.isMultiSelect}
          selectedIds={currentAnswer}
          onChange={(ids) => setAnswers((prev) => ({ ...prev, [current.id]: ids }))}
          // Passing `review` is what flips QuestionCard into its read-only
          // graded state, so it stays undefined until this question is checked.
          review={
            currentChecked
              ? {
                  isCorrect: currentChecked.isCorrect,
                  correctChoiceIds: currentChecked.correctChoiceIds,
                  explanation: currentChecked.explanation,
                }
              : undefined
          }
        />

        {error && <p className="mt-4 text-sm text-danger-600 dark:text-danger-400">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            {answeredCount} of {questions.length} answered
          </span>

          {canCheck ? (
            <Button onClick={handleCheck} loading={checking}>
              {checking ? "Checking…" : "Check answer"}
            </Button>
          ) : isLast ? (
            <Button onClick={handleSubmit} loading={submitting}>
              {submitting ? "Submitting…" : "Submit Quiz"}
            </Button>
          ) : (
            <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
