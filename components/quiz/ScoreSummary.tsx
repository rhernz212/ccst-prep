import Link from "next/link";
import type { QuizQuestion, QuizResult } from "@/lib/quiz/types";
import { QuestionCard } from "./QuestionCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
    <div className="animate-fade-in-up">
      <Card className="p-6 text-center">
        <div className="text-sm text-muted-foreground">{chapterTitle}</div>
        <div className="animate-pop mt-1 text-4xl font-bold text-foreground">{pct}%</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {correctCount} of {result.questionCount} correct
        </div>
        {!result.saved && (
          <p className="mt-3 text-sm text-warning-700 dark:text-warning-400">
            <Link href={`/sign-in?redirect=${encodeURIComponent(`/exams/${examSlug}/quizzes`)}`} className="underline">
              Sign in
            </Link>{" "}
            to save your score.
          </p>
        )}
        <div className="mt-4 flex justify-center gap-3">
          <Button variant="secondary" onClick={onRetry}>
            Retry quiz
          </Button>
          <Button href={`/exams/${examSlug}/quizzes`}>Back to quizzes</Button>
        </div>
      </Card>

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
