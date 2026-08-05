"use client";

import { useSyncExternalStore } from "react";
import { readCount, subscribe } from "@/lib/study/read-sections";

/**
 * "7 of 19 read", above the section list in the chapter nav.
 *
 * No aria-live. A forty-screen chapter crosses this threshold nineteen times,
 * and announcing each one would talk over the reader for the whole chapter.
 * The per-section marks are already labelled "Read", which is where a screen
 * reader user gets this on demand instead of by interruption.
 */
export function ChapterProgressCount({
  chapterSlug,
  initialCount,
  total,
}: {
  chapterSlug: string;
  initialCount: number;
  total: number;
}) {
  const read = useSyncExternalStore(
    subscribe,
    () => initialCount + readCount(chapterSlug),
    () => initialCount
  );

  if (total === 0) return null;

  // Layout-neutral on purpose — the caller positions it against whatever it
  // sits above.
  return (
    <p className="tabular text-xs font-medium text-muted-foreground">
      {read} of {total} read
    </p>
  );
}
