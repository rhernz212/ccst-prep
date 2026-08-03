"use client";

import { useState } from "react";
import type { QuizQuestion, QuizResult } from "@/lib/quiz/types";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ReviewSummary } from "./ReviewSummary";
import { Button } from "@/components/ui/Button";

export function ReviewRunner({
  examSlug,
  questions,
}: {
  examSlug: string;
  questions: QuizQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = Object.values(answers).filter((ids) => ids.length > 0).length;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/review-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedChoiceIds: answers[q.id] ?? [],
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to submit review");
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
      <ReviewSummary examSlug={examSlug} result={result} questions={questions} answers={answers} />
    );
  }

  return (
    <div key={current.id} className="animate-fade-in-up">
      <QuestionCard
        index={index}
        total={questions.length}
        stem={current.stem}
        choices={current.choices}
        isMultiSelect={current.isMultiSelect}
        selectedIds={answers[current.id] ?? []}
        onChange={(ids) => setAnswers((prev) => ({ ...prev, [current.id]: ids }))}
      />

      {error && <p className="mt-4 text-sm text-danger-600 dark:text-danger-400">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
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
        {isLast ? (
          <Button onClick={handleSubmit} loading={submitting}>
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>Next</Button>
        )}
      </div>
    </div>
  );
}
