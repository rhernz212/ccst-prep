"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamQuestion } from "@/lib/exam/types";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ExamTimer } from "./ExamTimer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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

  return (
    <div>
      <Card className="mb-4 flex items-center justify-between p-4">
        <div className="text-sm text-muted-foreground">
          Question {index + 1} of {questions.length}
        </div>
        <ExamTimer startedAt={startedAt} timeLimitMinutes={timeLimitMinutes} onExpire={finalize} />
      </Card>

      <div className="mb-4 flex flex-wrap gap-1">
        {questions.map((q, i) => {
          const answered = (answers[q.id] ?? []).length > 0;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-8 w-8 rounded-md text-xs font-medium transition-colors ${
                i === index
                  ? "bg-brand-600 text-white"
                  : answered
                    ? "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                    : "bg-surface-hover text-muted-foreground"
              }`}
            >
              {i + 1}
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

      <div className="mt-6 flex items-center justify-between">
        <Button variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          Previous
        </Button>
        {index < questions.length - 1 ? (
          <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>Next</Button>
        ) : (
          <Button variant="success" onClick={handleSubmitClick} loading={submitting}>
            {submitting ? "Submitting…" : "Submit Exam"}
          </Button>
        )}
      </div>
    </div>
  );
}
