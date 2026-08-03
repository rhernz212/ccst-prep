import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gradeAnswers } from "@/lib/quiz/grade";
import { recordReviewResults } from "@/lib/review/recordReviewResults";
import type { QuizResult, SubmittedAnswer } from "@/lib/quiz/types";

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

  const gradeResult = await gradeAnswers(supabase, answers);
  if ("error" in gradeResult) {
    return NextResponse.json({ error: gradeResult.error }, { status: 500 });
  }
  const { graded, score } = gradeResult;

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

    await recordReviewResults(
      supabase,
      user.id,
      graded.map((g) => ({ questionId: g.questionId, isCorrect: g.isCorrect }))
    );
  }

  const result: QuizResult = {
    score,
    questionCount: graded.length,
    graded,
    saved,
  };
  return NextResponse.json(result);
}
