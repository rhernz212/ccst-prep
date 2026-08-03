import type { QuizQuestion, QuizResult } from "@/lib/quiz/types";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function ReviewSummary({
  examSlug,
  result,
  questions,
  answers,
}: {
  examSlug: string;
  result: QuizResult;
  questions: QuizQuestion[];
  answers: Record<string, string[]>;
}) {
  const pct = Math.round(result.score * 100);
  const correctCount = result.graded.filter((g) => g.isCorrect).length;

  return (
    <div className="animate-fade-in-up">
      <Card className="p-6 text-center">
        <div className="text-sm text-muted-foreground">Review complete</div>
        <div className="animate-pop mt-1 text-4xl font-bold text-foreground">{pct}%</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {correctCount} of {result.questionCount} correct
        </div>
        <div className="mt-4 flex justify-center gap-3">
          <Button href={`/exams/${examSlug}/review`}>Back to review</Button>
        </div>
      </Card>

      <div className="mt-8 space-y-8">
        {questions.map((q: QuizQuestion, i: number) => {
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
