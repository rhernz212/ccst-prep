import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getExamMeta } from "@/lib/content/exam-content";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import type { QuizQuestion } from "@/lib/quiz/types";

export default async function ChapterQuizPage({
  params,
}: {
  params: Promise<{ examSlug: string; chapterSlug: string }>;
}) {
  const { examSlug, chapterSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  const supabase = await createClient();

  const { data: examRow } = await supabase.from("exams").select("id").eq("slug", examSlug).maybeSingle();
  if (!examRow) notFound();

  const { data: chapter } = await supabase
    .from("chapters")
    .select("id, number, title")
    .eq("exam_id", examRow.id)
    .eq("slug", chapterSlug)
    .maybeSingle();
  if (!chapter) notFound();

  const { data: rawQuestions } = await supabase
    .from("questions")
    .select("id, stem, is_multi_select, ordinal, question_choices(id, label, body, order_index)")
    .eq("chapter_id", chapter.id)
    .order("ordinal");

  // is_correct is intentionally never selected/forwarded here — grading
  // happens server-side in /api/quiz-attempts against the real DB rows.
  const questions: QuizQuestion[] = (rawQuestions ?? []).map((q) => ({
    id: q.id,
    stem: q.stem,
    isMultiSelect: q.is_multi_select,
    choices: (q.question_choices ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((c) => ({ id: c.id, label: c.label, body: c.body })),
  }));

  if (questions.length === 0) {
    return <p className="text-muted-foreground">No questions available for this chapter yet.</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <div className="text-sm text-muted-foreground">Chapter {chapter.number}</div>
        <h2 className="text-xl font-semibold text-foreground">{chapter.title} Quiz</h2>
      </div>
      <QuizRunner
        examSlug={examSlug}
        chapterId={chapter.id}
        chapterTitle={chapter.title}
        questions={questions}
      />
    </div>
  );
}
