"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamQuestion } from "@/lib/exam/types";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { NextIcon, RunnerNav, RunnerProgress } from "@/components/quiz/RunnerChrome";
import { ExamTimer } from "./ExamTimer";
import { Button } from "@/components/ui/Button";

export function ExamRunner({
  examSlug,
  attemptId,
  startedAt,
  timeLimitMinutes,
  questions,
}: {
  examSlug: string;
  attemptId: string;
  startedAt: string;
  timeLimitMinutes: number;
  questions: ExamQuestion[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  // ExamTimer's effect depends on `onExpire`'s identity, so finalize must
  // stay referentially stable across answer changes (otherwise every
  // keystroke would tear down and restart the countdown interval). A ref
  // lets it read the latest answers at call time without being a dependency.
  // Updated in an effect, not during render, per the rules of hooks.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const current = questions[index];

  const finalize = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await fetch(`/api/exam-attempts/${attemptId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedChoiceIds: answersRef.current[q.id] ?? [],
          })),
        }),
      });
    } finally {
      router.push(`/exams/${examSlug}/exam/${attemptId}/results`);
    }
  }, [attemptId, questions, examSlug, router]);

  function handleSubmitClick() {
    const answeredCount = Object.values(answers).filter((a) => a.length > 0).length;
    const unanswered = questions.length - answeredCount;
    if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
      return;
    }
    finalize();
  }

  const answeredCount = Object.values(answers).filter((a) => a.length > 0).length;

  return (
    <div>
      <RunnerProgress index={index} total={questions.length} answeredCount={answeredCount}>
        <ExamTimer startedAt={startedAt} timeLimitMinutes={timeLimitMinutes} onExpire={finalize} />
      </RunnerProgress>

      {/*
        48 numbered jump buttons. Three states have to be distinguishable at a
        glance and without relying on colour alone, so answered questions also
        carry a filled dot and the current one is ringed.
      */}
      <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Jump to question">
        {questions.map((q, i) => {
          const answered = (answers[q.id] ?? []).length > 0;
          const isCurrent = i === index;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-current={isCurrent ? "true" : undefined}
              aria-label={`Question ${i + 1}${answered ? ", answered" : ", not answered"}`}
              className={`tabular relative grid h-9 w-9 place-items-center rounded-lg text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-spring)] active:scale-90 ${
                isCurrent
                  ? "bg-brand-600 text-white shadow-brand ring-2 ring-brand-500/40 ring-offset-2 ring-offset-background"
                  : answered
                    ? "bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-500/20 dark:text-brand-200"
                    : "bg-surface-hover text-muted-foreground hover:text-foreground"
              }`}
            >
              {i + 1}
              {answered && !isCurrent && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-500 dark:bg-brand-300"
                />
              )}
            </button>
          );
        })}
      </div>

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
      </div>

      <RunnerNav
        onPrevious={() => setIndex((i) => Math.max(0, i - 1))}
        previousDisabled={index === 0}
      >
        {index < questions.length - 1 ? (
          <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
            Next
            <NextIcon />
          </Button>
        ) : (
          <Button variant="success" onClick={handleSubmitClick} loading={submitting}>
            {submitting ? "Submitting…" : "Submit exam"}
          </Button>
        )}
      </RunnerNav>
    </div>
  );
}
