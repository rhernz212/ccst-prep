import Link from "next/link";
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
                className={`block rounded px-2 py-1 ${
                  isCurrent
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {chapter.number}. {chapter.title}
              </Link>
              {isCurrent && (
                <ul className="mt-1 mb-2 ml-3 space-y-1 border-l border-gray-200 pl-3">
                  {chapter.sections.map((section) => {
                    const isRead = readAnchorIds?.has(section.anchorId);
                    return (
                      <li key={section.anchorId}>
                        <a
                          href={`#${section.anchorId}`}
                          className="flex items-center gap-1.5 py-0.5 text-gray-500 hover:text-gray-900"
                        >
                          {isRead && (
                            <span className="text-green-600" aria-label="Read">
                              ✓
                            </span>
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
