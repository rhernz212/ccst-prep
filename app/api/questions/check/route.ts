import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gradeAnswers } from "@/lib/quiz/grade";
import type { GradedAnswer } from "@/lib/quiz/types";

/**
 * Grades a single question without recording anything — backs the quizzes'
 * Practice mode, where the explanation is revealed as you go instead of at
 * the end.
 *
 * Deliberately does not persist: the spaced-repetition schedule and the
 * quiz_attempts row are still written by /api/quiz-attempts when the whole
 * quiz is submitted, so checking answers one at a time can't inflate a
 * score or double-advance a review interval.
 *
 * This exposes no more than the existing grading route already does —
 * POST /api/quiz-attempts returns correctChoiceIds and explanations for
 * every question it's given, including for anonymous visitors.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const body = (await request.json().catch(() => null)) as {
    questionId?: string;
    selectedChoiceIds?: string[];
  } | null;

  const questionId = body?.questionId;
  const selectedChoiceIds = body?.selectedChoiceIds;

  if (typeof questionId !== "string" || !Array.isArray(selectedChoiceIds)) {
    return NextResponse.json(
      { error: "questionId and a selectedChoiceIds array are required" },
      { status: 400 }
    );
  }

  const result = await gradeAnswers(supabase, [{ questionId, selectedChoiceIds }]);
  if ("error" in result) {
    // 400 for an id that doesn't exist, 500 for a database failure — the
    // grader distinguishes them so this route doesn't have to guess.
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const graded: GradedAnswer | undefined = result.graded[0];
  if (!graded) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json(graded);
}
