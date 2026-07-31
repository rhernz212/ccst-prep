import Link from "next/link";
import { notFound } from "next/navigation";
import { getExamMeta, listChapters } from "@/lib/content/exam-content";
import { ChapterNav } from "@/components/study/ChapterNav";
import { SectionRenderer } from "@/components/study/SectionRenderer";

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

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
      <ChapterNav examSlug={examSlug} chapters={chapters} currentChapterSlug={chapterSlug} />
      <article className="prose prose-slate max-w-none prose-img:rounded-md prose-img:border prose-img:border-gray-200">
        <div className="mb-1 text-sm font-medium text-blue-600">Chapter {chapter.number}</div>
        <h1>{chapter.title}</h1>
        <SectionRenderer html={chapter.introHtml} />
        {chapter.sections.map((section) => (
          <section key={section.anchorId} id={section.anchorId} className="scroll-mt-6">
            <SectionRenderer html={section.html} />
            {section.isReviewQuestions && (
              <Link
                href={`/exams/${examSlug}/quizzes`}
                className="not-prose inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Take the Chapter {chapter.number} quiz →
              </Link>
            )}
          </section>
        ))}
      </article>
    </div>
  );
}
