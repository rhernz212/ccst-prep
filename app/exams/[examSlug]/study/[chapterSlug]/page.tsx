import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getExamMeta, listChapters } from "@/lib/content/exam-content";
import { getChapterDbRefs } from "@/lib/progress/get-chapter-db-refs";
import { chapterHue } from "@/lib/ui/chapter-hue";
import { ChapterNav } from "@/components/study/ChapterNav";
import { SectionRenderer } from "@/components/study/SectionRenderer";
import { ReadingProgressMarker } from "@/components/study/ReadingProgressMarker";
import { Button } from "@/components/ui/Button";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ examSlug: string; chapterSlug: string }>;
}) {
  const { examSlug, chapterSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  const chapters = listChapters(examSlug);
  const chapter = chapters.find((c) => c.slug === chapterSlug);
  if (!chapter) notFound();

  const dbRefs = await getChapterDbRefs(examSlug, chapter.number);

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
      <ChapterNav
        examSlug={examSlug}
        chapters={chapters}
        currentChapterSlug={chapterSlug}
        readAnchorIds={dbRefs?.readAnchorIds}
      />
      {/* min-w-0: figures now carry intrinsic width attributes (up to 1400px),
          and a grid track sized `1fr` takes its minimum from content, so
          without this the column stretches to the widest image and drags the
          whole page into horizontal scroll. */}
      <article className="prose prose-slate dark:prose-invert prose-img:rounded-xl prose-img:border prose-img:border-border prose-headings:tracking-tight min-w-0 max-w-none">
        <div className="not-prose mb-6 flex items-center gap-3.5">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold text-white shadow-raised"
            style={{
              background: `linear-gradient(160deg, ${chapterHue(chapter.number, 1.18)}, ${chapterHue(chapter.number)})`,
            }}
            aria-hidden="true"
          >
            <span className="tabular">{chapter.number}</span>
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Chapter {chapter.number}
            </div>
            {/* h2, not h1 — the exam layout's <h1>{exam.title}</h1> is the
                page's true top-level heading; every other tab's page heading
                is an h2. */}
            <h2 className="text-fluid-2xl font-bold text-balance text-foreground">
              {chapter.title}
            </h2>
          </div>
        </div>
        <SectionRenderer html={chapter.introHtml} />
        {chapter.sections.map((section) => {
          const sectionDbId = dbRefs?.sectionIdByAnchor.get(section.anchorId);
          return (
            <section key={section.anchorId} id={section.anchorId} className="scroll-mt-6">
              <SectionRenderer html={section.html} />
              {dbRefs?.userId && sectionDbId && (
                <ReadingProgressMarker chapterId={dbRefs.chapterId} sectionId={sectionDbId} />
              )}
              {section.isReviewQuestions && (
                <div className="not-prose mt-6 rounded-2xl border border-brand-200 bg-linear-to-br from-brand-50 to-surface p-5 text-center dark:border-brand-500/30 dark:from-brand-500/10 dark:to-surface">
                  <p className="mb-4 text-sm text-muted-foreground">
                    Ready to check what stuck?
                  </p>
                  <Button href={`/exams/${examSlug}/quizzes/${chapter.slug}`}>
                    Take the Chapter {chapter.number} quiz
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      </article>
    </div>
  );
}
