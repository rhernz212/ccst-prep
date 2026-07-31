import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getExamMeta } from "@/lib/content/exam-content";

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
    return <p className="text-gray-600">Quizzes aren&apos;t available yet for this exam.</p>;
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
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Practice Quizzes</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {(chapters ?? []).map((chapter) => {
          const questionCount = chapter.questions?.[0]?.count ?? 0;
          const best = bestScoreByChapter.get(chapter.id);

          if (questionCount === 0) {
            return (
              <li key={chapter.id}>
                <div className="rounded-lg border border-gray-100 p-4 text-gray-500">
                  <div className="text-sm">Chapter {chapter.number}</div>
                  <div className="font-medium">{chapter.title}</div>
                  <div className="mt-1 text-xs">No questions available</div>
                </div>
              </li>
            );
          }

          return (
            <li key={chapter.id}>
              <Link
                href={`/exams/${examSlug}/quizzes/${chapter.slug}`}
                className="block rounded-lg border border-gray-200 p-4 transition hover:border-blue-400 hover:shadow-sm"
              >
                <div className="text-sm text-gray-600">Chapter {chapter.number}</div>
                <div className="font-medium text-gray-900">{chapter.title}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {questionCount} questions
                  {best !== undefined ? ` · best ${Math.round(best * 100)}%` : ""}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
