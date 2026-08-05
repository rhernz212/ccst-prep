import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gradeAnswers } from "@/lib/quiz/grade";
import { recordReviewResults } from "@/lib/review/recordReviewResults";
import type { QuizResult, SubmittedAnswer } from "@/lib/quiz/types";

interface RequestBody {
  answers?: SubmittedAnswer[];
  /**
   * Which of `answers` should advance their spaced-repetition schedule.
   * Omitted means all of them.
   *
   * This exists because the runner flushes answers early when the tab is
   * hidden, then still needs every question graded at the end to render the
   * summary. Grading is a pure read and can be repeated; rescheduling can't —
   * a card graded twice would jump two intervals ahead off one recall.
   */
  scheduleFor?: string[];
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
    return NextResponse.json({ error: gradeResult.error }, { status: gradeResult.status });
  }
  const { graded, score } = gradeResult;

  const scheduleFor = Array.isArray(body?.scheduleFor) ? new Set(body.scheduleFor) : null;
  await recordReviewResults(
    supabase,
    user.id,
    graded
      .filter((g) => scheduleFor === null || scheduleFor.has(g.questionId))
      .map((g) => ({ questionId: g.questionId, isCorrect: g.isCorrect })),
    "review"
  );

  const result: QuizResult = {
    score,
    questionCount: graded.length,
    graded,
    saved: true,
  };
  return NextResponse.json(result);
}
