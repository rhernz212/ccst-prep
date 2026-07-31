import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GradedAnswer, QuizResult, SubmittedAnswer } from "@/lib/quiz/types";

interface RequestBody {
  chapterId?: string;
  answers?: SubmittedAnswer[];
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const chapterId = body?.chapterId;
  const answers = body?.answers;

  if (typeof chapterId !== "string" || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json(
      { error: "chapterId and a non-empty answers array are required" },
      { status: 400 }
    );
  }

  const questionIds = answers.map((a) => a.questionId);
  const { data: questions, error: fetchError } = await supabase
    .from("questions")
    .select("id, explanation, question_choices(id, is_correct)")
    .in("id", questionIds);

  if (fetchError || !questions) {
    return NextResponse.json({ error: fetchError?.message ?? "Failed to load questions" }, { status: 500 });
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

  let saved = false;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        user_id: user.id,
        chapter_id: chapterId,
        submitted_at: new Date().toISOString(),
        score,
        question_count: graded.length,
      })
      .select()
      .single();

    if (!attemptError && attempt) {
      const { error: answersError } = await supabase.from("quiz_attempt_answers").insert(
        graded.map((g) => ({
          attempt_id: attempt.id,
          question_id: g.questionId,
          selected_choice_ids: answers.find((a) => a.questionId === g.questionId)?.selectedChoiceIds ?? [],
          is_correct: g.isCorrect,
        }))
      );
      saved = !answersError;
    }
  }

  const result: QuizResult = {
    score,
    questionCount: graded.length,
    graded,
    saved,
  };
  return NextResponse.json(result);
}
