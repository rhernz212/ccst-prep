import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gradeAnswers } from "@/lib/quiz/grade";
import { recordReviewResults } from "@/lib/review/recordReviewResults";
import type { QuizResult, SubmittedAnswer } from "@/lib/quiz/types";

interface RequestBody {
  answers?: SubmittedAnswer[];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const answers = body?.answers;

  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "A non-empty answers array is required" }, { status: 400 });
  }

  const gradeResult = await gradeAnswers(supabase, answers);
  if ("error" in gradeResult) {
    return NextResponse.json({ error: gradeResult.error }, { status: 500 });
  }
  const { graded, score } = gradeResult;

  await recordReviewResults(
    supabase,
    user.id,
    graded.map((g) => ({ questionId: g.questionId, isCorrect: g.isCorrect }))
  );

  const result: QuizResult = {
    score,
    questionCount: graded.length,
    graded,
    saved: true,
  };
  return NextResponse.json(result);
}
