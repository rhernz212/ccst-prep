import type { QuizQuestion, QuizResult } from "@/lib/quiz/types";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScoreDial } from "@/components/ui/ScoreDial";

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
  const correctCount = result.graded.filter((g) => g.isCorrect).length;

  return (
    <div className="animate-fade-in-up">
      <Card className="aura overflow-hidden p-6 sm:p-8">
        <ScoreDial
          score={result.score}
          caption="Review complete"
          detail={
            <>
              <span className="tabular font-semibold text-foreground">{correctCount}</span> of{" "}
              <span className="tabular">{result.questionCount}</span> correct — everything you saw
              has been rescheduled.
            </>
          }
        />
        <div className="mt-7 flex justify-center">
          <Button href={`/exams/${examSlug}/review`}>Back to review</Button>
        </div>
      </Card>

      <h3 className="mt-10 mb-4 text-fluid-lg font-semibold text-foreground">
        Every question, with the reasoning
      </h3>
      <div className="space-y-4">
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
