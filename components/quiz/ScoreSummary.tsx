import Link from "next/link";
import { RotateCcw } from "lucide-react";
import type { QuizQuestion, QuizResult } from "@/lib/quiz/types";
import { QuestionCard } from "./QuestionCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScoreDial } from "@/components/ui/ScoreDial";

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
  const correctCount = result.graded.filter((g) => g.isCorrect).length;

  return (
    <div className="animate-fade-in-up">
      <Card className="aura overflow-hidden p-6 sm:p-8">
        <ScoreDial
          score={result.score}
          caption={chapterTitle}
          detail={
            <>
              <span className="tabular font-semibold text-foreground">{correctCount}</span> of{" "}
              <span className="tabular">{result.questionCount}</span> correct
            </>
          }
        />

        {!result.saved && (
          <p className="mt-5 text-center text-sm text-warning-700 dark:text-warning-400">
            <Link
              href={`/sign-in?redirect=${encodeURIComponent(`/exams/${examSlug}/quizzes`)}`}
              className="font-semibold underline underline-offset-2"
            >
              Sign in
            </Link>{" "}
            to save your score.
          </p>
        )}

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="secondary" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry quiz
          </Button>
          <Button href={`/exams/${examSlug}/quizzes`}>Back to quizzes</Button>
        </div>
      </Card>

      <h3 className="mt-10 mb-4 text-fluid-lg font-semibold text-foreground">
        Every question, with the reasoning
      </h3>
      <div className="space-y-4">
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
