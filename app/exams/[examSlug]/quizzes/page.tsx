import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getExamMeta } from "@/lib/content/exam-content";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function QuizzesIndexPage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: examRow } = await supabase.from("exams").select("id").eq("slug", examSlug).maybeSingle();
  if (!examRow) {
    return <p className="text-muted-foreground">Quizzes aren&apos;t available yet for this exam.</p>;
  }

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, number, slug, title, questions(count)")
    .eq("exam_id", examRow.id)
    .order("number");

  const bestScoreByChapter = new Map<string, number>();
  if (user) {
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("chapter_id, score")
      .eq("user_id", user.id)
      .not("score", "is", null);

    for (const attempt of attempts ?? []) {
      const prev = bestScoreByChapter.get(attempt.chapter_id) ?? 0;
      if ((attempt.score ?? 0) > prev) bestScoreByChapter.set(attempt.chapter_id, attempt.score ?? 0);
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-foreground">Practice Quizzes</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {(chapters ?? []).map((chapter) => {
          const questionCount = chapter.questions?.[0]?.count ?? 0;
          const best = bestScoreByChapter.get(chapter.id);

          if (questionCount === 0) {
            return (
              <li key={chapter.id}>
                <div className="rounded-lg border border-border p-4 text-muted-foreground">
                  <div className="text-sm">Chapter {chapter.number}</div>
                  <div className="font-medium">{chapter.title}</div>
                  <div className="mt-1 text-xs">No questions available</div>
                </div>
              </li>
            );
          }

          return (
            <li key={chapter.id}>
              <Card href={`/exams/${examSlug}/quizzes/${chapter.slug}`} interactive className="p-4">
                <div className="text-sm text-muted-foreground">Chapter {chapter.number}</div>
                <div className="font-medium text-foreground">{chapter.title}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{questionCount} questions</span>
                  {best !== undefined && (
                    <Badge variant="success">best {Math.round(best * 100)}%</Badge>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
