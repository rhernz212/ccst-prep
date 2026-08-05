"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamQuestion } from "@/lib/exam/types";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { NextIcon, RunnerNav, RunnerProgress } from "@/components/quiz/RunnerChrome";
import { ExamTimer } from "./ExamTimer";
import { Button } from "@/components/ui/Button";

/** Long enough to coalesce a burst of clicks on a multi-select, short enough
 *  that stepping to the next question has already saved the last one. */
const AUTOSAVE_DEBOUNCE_MS = 500;

export function ExamRunner({
  examSlug,
  attemptId,
  startedAt,
  timeLimitMinutes,
  questions,
  initialAnswers = {},
}: {
  examSlug: string;
  attemptId: string;
  startedAt: string;
  timeLimitMinutes: number;
  questions: ExamQuestion[];
  /** Answers already saved for this attempt, so a resumed exam starts where
   *  it left off rather than blank. */
  initialAnswers?: Record<string, string[]>;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>(initialAnswers);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  // Answers picked but not yet written, keyed by question. A map rather than
  // a queue so re-answering the same question replaces its pending write.
  const pendingSavesRef = useRef(new Map<string, string[]>());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /**
   * Records one answer as it's picked.
   *
   * Debounced per question so working through a six-option multi-select is
   * one write rather than six, and fire-and-forget: a failed autosave must
   * never interrupt someone mid-exam, because finalize still sends every
   * answer at the end and is the real backstop. The point of this is only
   * that the attempt survives the tab closing.
   */
  const flushPending = useCallback(() => {
    const pending = pendingSavesRef.current;
    if (pending.size === 0 || submittedRef.current) return;

    const entries = [...pending.entries()];
    pending.clear();

    for (const [questionId, selectedChoiceIds] of entries) {
      // keepalive is the whole trick: it lets the request outlive the page,
      // so the answer you were on when you closed the tab still lands.
      void fetch(`/api/exam-attempts/${attemptId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, selectedChoiceIds }),
        keepalive: true,
      }).catch(() => {});
    }
  }, [attemptId]);

  function handleAnswerChange(questionId: string, ids: string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: ids }));
    pendingSavesRef.current.set(questionId, ids);

    // Debounced so working through a six-option multi-select is one write
    // rather than six. Fire-and-forget: a failed autosave must never
    // interrupt someone mid-exam, and finalize still sends every answer at
    // the end. This only has to make the attempt survive the tab closing.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushPending, AUTOSAVE_DEBOUNCE_MS);
  }

  // pagehide rather than beforeunload: it fires on mobile tab-switching and
  // app backgrounding, which is where an exam actually gets abandoned.
  // Unmount flushes too, since navigating away mid-exam is the same loss.
  useEffect(() => {
    const onPageHide = () => flushPending();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushPending();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      flushPending();
    };
  }, [flushPending]);

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
          onChange={(ids) => handleAnswerChange(current.id, ids)}
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
