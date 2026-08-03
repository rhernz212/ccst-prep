import type { createClient } from "@/lib/supabase/server";
import type { GradedAnswer, SubmittedAnswer } from "@/lib/quiz/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function gradeAnswers(
  supabase: SupabaseServerClient,
  answers: SubmittedAnswer[]
): Promise<{ graded: GradedAnswer[]; score: number } | { error: string }> {
  const questionIds = answers.map((a) => a.questionId);
  const { data: questions, error: fetchError } = await supabase
    .from("questions")
    .select("id, explanation, question_choices(id, is_correct)")
    .in("id", questionIds);

  if (fetchError || !questions) {
    return { error: fetchError?.message ?? "Failed to load questions" };
  }

  const graded: GradedAnswer[] = answers.map((answer) => {
    const question = questions.find((q) => q.id === answer.questionId);
    const choices = question?.question_choices ?? [];
    const correctChoiceIds = choices.filter((c) => c.is_correct).map((c) => c.id);
    const selected = new Set(answer.selectedChoiceIds);

    const isCorrect =
      correctChoiceIds.length === selected.size && correctChoiceIds.every((id) => selected.has(id));

    return {
      questionId: answer.questionId,
      isCorrect,
      correctChoiceIds,
      explanation: question?.explanation ?? "",
    };
  });

  const score = graded.length > 0 ? graded.filter((g) => g.isCorrect).length / graded.length : 0;

  return { graded, score };
}
