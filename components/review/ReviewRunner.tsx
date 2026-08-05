"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QuizQuestion, QuizResult } from "@/lib/quiz/types";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ReviewSummary } from "./ReviewSummary";
import { NextIcon, RunnerNav, RunnerProgress } from "@/components/quiz/RunnerChrome";
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

  // Questions already sent to the server. Every path that submits consults
  // this first, so a question can only ever advance its spaced-repetition
  // schedule once — a card graded twice would jump two intervals ahead off
  // one recall attempt, which is worse than losing the session.
  const sentRef = useRef(new Set<string>());
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = Object.values(answers).filter((ids) => ids.length > 0).length;

  /**
   * Sends the answers that haven't been recorded yet, on the way out.
   *
   * The queue used to hold all twenty answers in React state and post them
   * only on "Finish review", so closing the tab at question nineteen
   * scheduled nothing at all — the exact session most worth keeping, since
   * every one of those cards was due. keepalive lets the request outlive the
   * page it was fired from.
   */
  const flushUnsent = useCallback(() => {
    const unsent = questions
      .filter((q) => !sentRef.current.has(q.id) && (answersRef.current[q.id] ?? []).length > 0)
      .map((q) => ({ questionId: q.id, selectedChoiceIds: answersRef.current[q.id] }));

    if (unsent.length === 0) return;
    for (const answer of unsent) sentRef.current.add(answer.questionId);

    void fetch("/api/review-attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: unsent }),
      keepalive: true,
    }).catch(() => {});
  }, [questions]);

  useEffect(() => {
    const onPageHide = () => flushUnsent();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushUnsent();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flushUnsent();
    };
  }, [flushUnsent]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    // Every question is sent so the summary can grade the whole session, but
    // only the ones an early flush hasn't already recorded are allowed to
    // move their schedule. Unanswered questions count as sent here: skipping
    // a card is a failed recall, and the schedule should hear about it.
    const scheduleFor = questions.filter((q) => !sentRef.current.has(q.id)).map((q) => q.id);
    for (const id of scheduleFor) sentRef.current.add(id);

    try {
      const res = await fetch("/api/review-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedChoiceIds: answers[q.id] ?? [],
          })),
          scheduleFor,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to submit review");
      }
      const data: QuizResult = await res.json();
      setResult(data);
    } catch (err) {
      // Put them back in the unsent pile, or the retry button would submit
      // with an empty scheduleFor and silently schedule nothing.
      for (const id of scheduleFor) sentRef.current.delete(id);
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
    <div>
      <RunnerProgress index={index} total={questions.length} answeredCount={answeredCount} />

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

        {error && (
          <p className="mt-4 rounded-lg border border-danger-300 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/50 dark:bg-danger-500/10 dark:text-danger-300">
            {error}
          </p>
        )}

        <RunnerNav
          onPrevious={() => setIndex((i) => Math.max(0, i - 1))}
          previousDisabled={index === 0}
        >
          {isLast ? (
            <Button variant="success" onClick={handleSubmit} loading={submitting}>
              {submitting ? "Submitting…" : "Finish review"}
            </Button>
          ) : (
            <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
              Next
              <NextIcon />
            </Button>
          )}
        </RunnerNav>
      </div>
    </div>
  );
}
