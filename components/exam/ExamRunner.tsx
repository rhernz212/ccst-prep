"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamQuestion } from "@/lib/exam/types";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ExamTimer } from "./ExamTimer";

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
      <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 p-4">
        <div className="text-sm text-gray-500">
          Question {index + 1} of {questions.length}
        </div>
        <ExamTimer startedAt={startedAt} timeLimitMinutes={timeLimitMinutes} onExpire={finalize} />
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {questions.map((q, i) => {
          const answered = (answers[q.id] ?? []).length > 0;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-8 w-8 rounded text-xs font-medium ${
                i === index
                  ? "bg-blue-600 text-white"
                  : answered
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <QuestionCard
        index={index}
        total={questions.length}
        stem={current.stem}
        choices={current.choices}
        isMultiSelect={current.isMultiSelect}
        selectedIds={answers[current.id] ?? []}
        onChange={(ids) => setAnswers((prev) => ({ ...prev, [current.id]: ids }))}
      />

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40"
        >
          Previous
        </button>
        {index < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={submitting}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Exam"}
          </button>
        )}
      </div>
    </div>
  );
}
