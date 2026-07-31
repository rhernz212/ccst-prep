import Link from "next/link";
import { Check } from "lucide-react";
import type { Chapter } from "@/lib/content/types";

export function ChapterNav({
  examSlug,
  chapters,
  currentChapterSlug,
  readAnchorIds,
}: {
  examSlug: string;
  chapters: Chapter[];
  currentChapterSlug: string;
  /** anchorIds of sections the current user has already read, for the current chapter only. */
  readAnchorIds?: Set<string>;
}) {
  return (
    <nav className="mb-8 text-sm lg:sticky lg:top-4 lg:mb-0 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
      <ul className="space-y-1">
        {chapters.map((chapter) => {
          const isCurrent = chapter.slug === currentChapterSlug;
          return (
            <li key={chapter.slug}>
              <Link
                href={`/exams/${examSlug}/study/${chapter.slug}`}
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
                              className="h-3.5 w-3.5 text-success-600 dark:text-success-400"
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
    </nav>
  );
}
