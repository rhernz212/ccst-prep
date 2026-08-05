"use client";

import { useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { hasRead, subscribe } from "@/lib/study/read-sections";

/**
 * The read/unread mark beside a section in the chapter nav.
 *
 * Its own client component rather than making ChapterNav one: this is the
 * only part of a fourteen-chapter list that ever changes, and the list around
 * it stays server-rendered markup.
 *
 * `initiallyRead` is what the server knew at request time; the store holds
 * only what has been read since. Reading them in that order is also what
 * keeps hydration quiet — at hydration the store is empty, so the first
 * client snapshot equals the server one by construction.
 */
export function SectionReadMark({
  chapterSlug,
  anchorId,
  initiallyRead,
}: {
  chapterSlug: string;
  anchorId: string;
  initiallyRead: boolean;
}) {
  const read = useSyncExternalStore(
    subscribe,
    () => initiallyRead || hasRead(chapterSlug, anchorId),
    () => initiallyRead
  );

  if (!read) {
    return (
      <span
        aria-hidden="true"
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong"
      />
    );
  }

  return (
    <Check
      // Popping only on the client-side transition. Animating on mount too
      // would set off every already-read section at once on page load, which
      // is celebration for something the reader did last week.
      className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-400 ${
        initiallyRead ? "" : "animate-pop"
      }`}
      aria-label="Read"
    />
  );
}
