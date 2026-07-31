import Link from "next/link";
import type { QuizQuestion, QuizResult } from "@/lib/quiz/types";
import { QuestionCard } from "./QuestionCard";

export function ScoreSummary({
  examSlug,
  chapterTitle,
  result,
  questions,
  answers,
  onRetry,
}: {
  examSlug: string;
  chapterTitle: string;
  result: QuizResult;
  questions: QuizQuestion[];
  answers: Record<string, string[]>;
  onRetry: () => void;
}) {
  const pct = Math.round(result.score * 100);
  const correctCount = result.graded.filter((g) => g.isCorrect).length;

  return (
    <div>
      <div className="rounded-lg border border-gray-200 p-6 text-center">
        <div className="text-sm text-gray-600">{chapterTitle}</div>
        <div className="mt-1 text-4xl font-bold text-gray-900">{pct}%</div>
        <div className="mt-1 text-sm text-gray-600">
          {correctCount} of {result.questionCount} correct
        </div>
        {!result.saved && (
          <p className="mt-3 text-sm text-amber-700">
            <Link href={`/sign-in?redirect=${encodeURIComponent(`/exams/${examSlug}/quizzes`)}`} className="underline">
              Sign in
            </Link>{" "}
            to save your score.
          </p>
        )}
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Retry quiz
          </button>
          <Link
            href={`/exams/${examSlug}/quizzes`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to quizzes
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {questions.map((q, i) => {
          const graded = result.graded.find((g) => g.questionId === q.id);
          if (!graded) return null;
          return (
            <QuestionCard
              key={q.id}
              index={i}
              total={questions.length}
              stem={q.stem}
              choices={q.choices}
              isMultiSelect={q.isMultiSelect}
              selectedIds={answers[q.id] ?? []}
              review={{
                isCorrect: graded.isCorrect,
                correctChoiceIds: graded.correctChoiceIds,
                explanation: graded.explanation,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
