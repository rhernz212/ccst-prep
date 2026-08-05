import { describe, expect, it } from "vitest";
import { gradeAnswers } from "@/lib/quiz/grade";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface FakeQuestion {
  id: string;
  explanation: string | null;
  question_choices: { id: string; is_correct: boolean }[];
}

/**
 * The narrowest possible stand-in for the one query gradeAnswers makes:
 * `.from("questions").select(...).in("id", ids)`. The real client is a
 * builder whose terminal call is awaited, so `in` returns the result
 * directly.
 */
function fakeSupabase(questions: FakeQuestion[], error: { message: string } | null = null) {
  return {
    from: () => ({
      select: () => ({
        in: (_column: string, ids: string[]) =>
          Promise.resolve({
            data: error ? null : questions.filter((q) => ids.includes(q.id)),
            error,
          }),
      }),
    }),
  } as unknown as SupabaseServerClient;
}

const QUESTIONS: FakeQuestion[] = [
  {
    id: "q1",
    explanation: "Because.",
    question_choices: [
      { id: "a", is_correct: true },
      { id: "b", is_correct: false },
    ],
  },
  {
    id: "q2",
    explanation: "Two of these.",
    question_choices: [
      { id: "c", is_correct: true },
      { id: "d", is_correct: true },
      { id: "e", is_correct: false },
    ],
  },
];

describe("gradeAnswers", () => {
  it("grades a single-answer question", async () => {
    const result = await gradeAnswers(fakeSupabase(QUESTIONS), [
      { questionId: "q1", selectedChoiceIds: ["a"] },
    ]);

    expect("graded" in result && result.graded[0].isCorrect).toBe(true);
    expect("score" in result && result.score).toBe(1);
  });

  it("requires every correct choice on a multi-select, and nothing more", async () => {
    const partial = await gradeAnswers(fakeSupabase(QUESTIONS), [
      { questionId: "q2", selectedChoiceIds: ["c"] },
    ]);
    expect("graded" in partial && partial.graded[0].isCorrect).toBe(false);

    const both = await gradeAnswers(fakeSupabase(QUESTIONS), [
      { questionId: "q2", selectedChoiceIds: ["c", "d"] },
    ]);
    expect("graded" in both && both.graded[0].isCorrect).toBe(true);

    const extra = await gradeAnswers(fakeSupabase(QUESTIONS), [
      { questionId: "q2", selectedChoiceIds: ["c", "d", "e"] },
    ]);
    expect("graded" in extra && extra.graded[0].isCorrect).toBe(false);
  });

  it("marks an unanswered known question wrong rather than correct", async () => {
    const result = await gradeAnswers(fakeSupabase(QUESTIONS), [
      { questionId: "q1", selectedChoiceIds: [] },
    ]);

    expect("graded" in result && result.graded[0].isCorrect).toBe(false);
  });

  /**
   * The regression that matters: an id that doesn't resolve used to produce
   * `correctChoiceIds = []`, which an empty selection satisfied — so a
   * hand-rolled POST of invented ids scored 100%.
   */
  it("rejects a question id that doesn't exist instead of grading it correct", async () => {
    const result = await gradeAnswers(fakeSupabase(QUESTIONS), [
      { questionId: "does-not-exist", selectedChoiceIds: [] },
    ]);

    expect("error" in result).toBe(true);
    expect("status" in result && result.status).toBe(400);
  });

  it("rejects a batch where only some ids are real", async () => {
    const result = await gradeAnswers(fakeSupabase(QUESTIONS), [
      { questionId: "q1", selectedChoiceIds: ["a"] },
      { questionId: "forged", selectedChoiceIds: [] },
    ]);

    expect("error" in result).toBe(true);
    expect("status" in result && result.status).toBe(400);
  });

  it("reports a database failure as a server error, not a bad request", async () => {
    const result = await gradeAnswers(fakeSupabase([], { message: "connection reset" }), [
      { questionId: "q1", selectedChoiceIds: ["a"] },
    ]);

    expect("status" in result && result.status).toBe(500);
  });
});
