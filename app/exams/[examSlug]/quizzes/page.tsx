import { notFound } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getExamMeta } from "@/lib/content/exam-content";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { chapterHue } from "@/lib/ui/chapter-hue";

export default async function QuizzesIndexPage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: examRow } = await supabase.from("exams").select("id").eq("slug", examSlug).maybeSingle();
  if (!examRow) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Quizzes aren&apos;t available yet for this exam.
      </Card>
    );
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

  const attempted = bestScoreByChapter.size;
  const totalChapters = (chapters ?? []).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-fluid-xl font-semibold text-foreground">Practice Quizzes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The review questions from every chapter, gradeable one at a time or all at once.
          </p>
        </div>
        {user && totalChapters > 0 && (
          <div className="tabular text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{attempted}</span> of {totalChapters}{" "}
            chapters attempted
          </div>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(chapters ?? []).map((chapter) => {
          const questionCount = chapter.questions?.[0]?.count ?? 0;
          const best = bestScoreByChapter.get(chapter.id);
          const hue = chapterHue(chapter.number);

          if (questionCount === 0) {
            return (
              <li key={chapter.id}>
                <Card className="flex h-full items-start gap-3.5 p-4 opacity-60">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-hover text-muted-foreground"
                    aria-hidden="true"
                  >
                    <Lock className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Chapter {chapter.number}
                    </span>
                    <span className="mt-0.5 block leading-snug font-semibold text-balance text-foreground">
                      {chapter.title}
                    </span>
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                      No questions available
                    </span>
                  </span>
                </Card>
              </li>
            );
          }

          return (
            <li key={chapter.id} className="reveal">
              <Card
                href={`/exams/${examSlug}/quizzes/${chapter.slug}`}
                interactive
                className="group flex h-full items-center gap-3.5 p-4"
              >
                {/* Once a chapter has a best score, the plain number tile is
                    replaced by a ring showing it — so the grid doubles as a
                    map of what's still weak, without a second layout. */}
                {best === undefined ? (
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-bold text-white shadow-raised"
                    style={{
                      background: `linear-gradient(160deg, ${chapterHue(chapter.number, 1.18)}, ${hue})`,
                    }}
                    aria-hidden="true"
                  >
                    <span className="tabular">{chapter.number}</span>
                  </span>
                ) : (
                  <ProgressRing
                    value={Math.round(best * 100)}
                    label={`Chapter ${chapter.number} best score: ${Math.round(best * 100)} percent`}
                    size={46}
                    thickness={5}
                    color={hue}
                  >
                    <span className="text-[0.6875rem]">{Math.round(best * 100)}</span>
                  </ProgressRing>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Chapter {chapter.number}
                  </span>
                  <span className="mt-0.5 block leading-snug font-semibold text-balance text-foreground">
                    {chapter.title}
                  </span>
                  <span className="tabular mt-1.5 block text-xs text-muted-foreground">
                    {questionCount} questions
                    {best !== undefined && ` · best ${Math.round(best * 100)}%`}
                  </span>
                </span>

                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-[transform,color] duration-200 ease-[var(--ease-spring)] group-hover:translate-x-1 group-hover:text-brand-500"
                  aria-hidden="true"
                />
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
