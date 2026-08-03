import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getExamMeta, listChapters } from "@/lib/content/exam-content";
import { Card } from "@/components/ui/Card";
import { chapterHue } from "@/lib/ui/chapter-hue";

export default async function StudyIndexPage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  const chapters = listChapters(examSlug);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-fluid-xl font-semibold text-foreground">Chapters</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The full book, section by section. Your place is marked as you read.
        </p>
      </div>

      {chapters.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          No chapters have been ingested yet.
        </Card>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {chapters.map((chapter) => (
          <li key={chapter.slug} className="reveal">
            <Card
              href={`/exams/${examSlug}/study/${chapter.slug}`}
              interactive
              className="group flex h-full items-start gap-3.5 p-4"
            >
              {/* The chapter's hue is derived from its number, so the same
                  chapter reads as the same colour everywhere it appears. */}
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-bold text-white shadow-raised"
                style={{
                  background: `linear-gradient(160deg, ${chapterHue(chapter.number, 1.18)}, ${chapterHue(chapter.number)})`,
                }}
                aria-hidden="true"
              >
                <span className="tabular">{chapter.number}</span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Chapter {chapter.number}
                </span>
                <span className="mt-0.5 block leading-snug font-semibold text-balance text-foreground">
                  {chapter.title}
                </span>
                <span className="tabular mt-1.5 block text-xs text-muted-foreground">
                  {chapter.sections.length} sections
                </span>
              </span>

              <ArrowRight
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-[transform,color] duration-200 ease-[var(--ease-spring)] group-hover:translate-x-1 group-hover:text-brand-500"
                aria-hidden="true"
              />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
