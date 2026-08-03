import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import type { Chapter } from "@/lib/content/types";

interface ChapterNavProps {
  examSlug: string;
  chapters: Chapter[];
  currentChapterSlug: string;
  /** anchorIds of sections the current user has already read, for the current chapter only. */
  readAnchorIds?: Set<string>;
}

function ChapterList({ examSlug, chapters, currentChapterSlug, readAnchorIds }: ChapterNavProps) {
  return (
    <ul className="space-y-1">
      {chapters.map((chapter) => {
        const isCurrent = chapter.slug === currentChapterSlug;
        return (
          <li key={chapter.slug}>
            <Link
              href={`/exams/${examSlug}/study/${chapter.slug}`}
              aria-current={isCurrent ? "page" : undefined}
              className={`block rounded px-2 py-1 transition-colors ${
                isCurrent
                  ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                  : "text-foreground hover:bg-surface-hover"
              }`}
            >
              {chapter.number}. {chapter.title}
            </Link>
            {isCurrent && (
              <ul className="mt-1 mb-2 ml-3 space-y-1 border-l border-border pl-3">
                {chapter.sections.map((section) => {
                  const isRead = readAnchorIds?.has(section.anchorId);
                  return (
                    <li key={section.anchorId}>
                      <a
                        href={`#${section.anchorId}`}
                        className="flex items-center gap-1.5 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {isRead && (
                          <Check
                            className="h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-400"
                            aria-label="Read"
                          />
                        )}
                        {section.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ChapterNav(props: ChapterNavProps) {
  const current = props.chapters.find((c) => c.slug === props.currentChapterSlug);

  return (
    <>
      {/*
        Two renderings of the same list rather than one repositioned element:
        below lg the expanded list runs ~700px tall, which pushed the chapter
        body nearly a full screen down the page on a phone. <details> collapses
        it without shipping any JS, and only one copy is ever in the
        accessibility tree since the other is display:none at any breakpoint.
      */}
      <details className="group mb-6 rounded-lg border border-border bg-surface lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm">
          <span className="min-w-0">
            <span className="font-medium text-foreground">Chapters</span>
            {current && (
              // Leading space is deliberate: without it this runs together as
              // "Chapters8. Wireless Technologies" when read aloud, since the
              // visual gap comes from margin rather than from the text.
              <span className="ml-2 text-muted-foreground">
                {" "}
                {current.number}. {current.title}
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <nav aria-label="Chapters" className="border-t border-border px-3 py-2 text-sm">
          <ChapterList {...props} />
        </nav>
      </details>

      <nav
        aria-label="Chapters"
        className="hidden text-sm lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto"
      >
        <ChapterList {...props} />
      </nav>
    </>
  );
}
