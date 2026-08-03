import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getExamMeta } from "@/lib/content/exam-content";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { Card } from "@/components/ui/Card";
import { chapterHue } from "@/lib/ui/chapter-hue";
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
    return (
      <Card className="p-8 text-center text-muted-foreground">
        No questions available for this chapter yet.
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3.5">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-bold text-white shadow-raised"
          style={{
            background: `linear-gradient(160deg, ${chapterHue(chapter.number, 1.18)}, ${chapterHue(chapter.number)})`,
          }}
          aria-hidden="true"
        >
          <span className="tabular">{chapter.number}</span>
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Chapter {chapter.number} quiz
          </div>
          <h2 className="text-fluid-xl font-semibold text-balance text-foreground">
            {chapter.title}
          </h2>
        </div>
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
