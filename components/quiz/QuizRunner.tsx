"use client";

import { useState } from "react";
import type { QuizQuestion, QuizResult } from "@/lib/quiz/types";
import { QuestionCard } from "./QuestionCard";
import { ScoreSummary } from "./ScoreSummary";

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
        onRetry={() => {
          setResult(null);
          setAnswers({});
          setIndex(0);
        }}
      />
    );
  }

  return (
    <div>
      <QuestionCard
        index={index}
        total={questions.length}
        stem={current.stem}
        choices={current.choices}
        isMultiSelect={current.isMultiSelect}
        selectedIds={answers[current.id] ?? []}
        onChange={(ids) => setAnswers((prev) => ({ ...prev, [current.id]: ids }))}
      />

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs text-gray-400">
          {answeredCount} of {questions.length} answered
        </span>
        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Quiz"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
