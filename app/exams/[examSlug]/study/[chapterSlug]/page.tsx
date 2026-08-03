import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getExamMeta, listChapters } from "@/lib/content/exam-content";
import { getChapterDbRefs } from "@/lib/progress/get-chapter-db-refs";
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
      <article className="prose prose-slate dark:prose-invert min-w-0 max-w-none prose-img:rounded-md prose-img:border prose-img:border-gray-200 dark:prose-img:border-border">
        <div className="mb-1 text-sm font-medium text-brand-600 dark:text-brand-400">
          Chapter {chapter.number}
        </div>
        {/* h2, not h1 — the exam layout's <h1>{exam.title}</h1> is the page's
            true top-level heading; every other tab's page heading is an h2. */}
        <h2 className="text-3xl">{chapter.title}</h2>
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
                <Button href={`/exams/${examSlug}/quizzes`} className="not-prose">
                  Take the Chapter {chapter.number} quiz
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </section>
          );
        })}
      </article>
    </div>
  );
}
