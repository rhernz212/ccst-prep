import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RequestBody {
  questionId?: string;
  selectedChoiceIds?: string[];
}

/**
 * Saves one answer, mid-exam.
 *
 * The exam used to hold every answer in React state and write the lot in
 * finalize, which meant a closed tab or a reload at question 47 of a
 * fifty-minute sitting lost all of it, with no way back in. The columns to
 * prevent that were already there and already written at the end — this just
 * writes them as you go.
 *
 * Deliberately does NOT grade: `is_correct` stays null until finalize. Sending
 * correctness back per answer would hand the client a free answer key, and
 * scoring is a whole-attempt operation anyway (domain breakdown, timeout
 * adjudication). This route only records what you picked.
 */
export async function POST(request: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const questionId = body?.questionId;
  const selectedChoiceIds = body?.selectedChoiceIds;

  if (typeof questionId !== "string" || !Array.isArray(selectedChoiceIds)) {
    return NextResponse.json(
      { error: "questionId and selectedChoiceIds are required" },
      { status: 400 }
    );
  }

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("id, user_id, status")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: "Exam attempt not found" }, { status: 404 });
  }

  // A submitted attempt is closed for editing — otherwise a late autosave
  // racing the final submit could rewrite an answer the score was based on.
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "This attempt has already been submitted" }, { status: 409 });
  }

  // Scoped by attempt_id as well as question_id: the row must belong to this
  // attempt, so a valid question from someone else's exam can't be written.
  const { error } = await supabase
    .from("exam_attempt_questions")
    .update({ selected_choice_ids: selectedChoiceIds, answered_at: new Date().toISOString() })
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
