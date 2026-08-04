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
              className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 transition-colors ${
                isCurrent
                  ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                  : "text-foreground hover:bg-surface-hover"
              }`}
            >
              <span
                aria-hidden="true"
                className="tabular mt-px inline-block w-4 shrink-0 text-right text-xs font-semibold text-muted-foreground"
              >
                {chapter.number}
              </span>
              <span className="min-w-0">{chapter.title}</span>
            </Link>
            {isCurrent && (
              <ul className="mt-1 mb-2 ml-4 space-y-0.5 border-l-2 border-brand-200 pl-3 dark:border-brand-500/30">
                {chapter.sections.map((section) => {
                  const isRead = readAnchorIds?.has(section.anchorId);
                  return (
                    <li key={section.anchorId}>
                      <a
                        href={`#${section.anchorId}`}
                        className="flex items-start gap-1.5 rounded-md py-1 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {isRead ? (
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-400"
                            aria-label="Read"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong"
                          />
                        )}
                        <span className="min-w-0">{section.title}</span>
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
      <details className="group surface-card mb-6 rounded-xl lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-sm">
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
        <nav
          aria-label="Chapters"
          className="max-h-[70vh] overflow-y-auto border-t border-border px-2.5 py-2 text-sm"
        >
          <ChapterList {...props} />
        </nav>
      </details>

      {/* top-36 clears both sticky bars — the app header (57px) and the exam
          tab rail (69px) — rather than the viewport edge, so the rail's first
          item isn't tucked underneath them. The max-height subtracts the same
          stack plus a little, so the list scrolls internally instead of
          running off the bottom of the viewport. */}
      <nav
        aria-label="Chapters"
        className="hidden text-sm lg:sticky lg:top-36 lg:block lg:max-h-[calc(100vh-10rem)] lg:self-start lg:overflow-y-auto lg:pr-2"
      >
        <ChapterList {...props} />
      </nav>
    </>
  );
}
