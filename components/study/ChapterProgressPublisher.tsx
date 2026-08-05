"use client";

import { useEffect } from "react";
import { clearActiveChapter, setActiveChapter } from "@/lib/study/read-sections";

/**
 * Registers the chapter being read so the exam layout's sticky chrome can
 * draw its progress.
 *
 * The layout can't know this on its own — it renders above the page and is
 * shared with six other tabs — and threading it down through the layout would
 * mean every tab carrying a prop only one of them uses. The page announces
 * itself instead, and the chrome subscribes.
 *
 * Renders nothing.
 */
export function ChapterProgressPublisher({
  chapterSlug,
  initialCount,
  total,
}: {
  chapterSlug: string;
  initialCount: number;
  total: number;
}) {
  useEffect(() => {
    setActiveChapter({ slug: chapterSlug, initialCount, total });
    return () => clearActiveChapter(chapterSlug);
  }, [chapterSlug, initialCount, total]);

  return null;
}
