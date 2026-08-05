"use client";

import { useEffect, useRef } from "react";
import { markRead } from "@/lib/study/read-sections";

/**
 * Invisible sentinel placed at the end of a section. Once it's been at
 * least half-visible for 3 continuous seconds, records the section as read.
 * Fires at most once per mount (page load) — cheap and good enough; no need
 * to debounce repeat scrolls back into view.
 *
 * The write still goes out for a section that was already read: the upsert
 * refreshes read_at, which is one of the timestamps the profile page's study
 * streak counts, so re-reading an old chapter has to register as studying
 * today. Only the UI update is skipped in that case — the mark is already
 * ticked, and telling the store would double-count it against the total.
 */
export function ReadingProgressMarker({
  chapterId,
  sectionId,
  chapterSlug,
  anchorId,
  initiallyRead,
}: {
  chapterId: string;
  sectionId: string;
  chapterSlug: string;
  anchorId: string;
  initiallyRead: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let fired = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (fired) return;
        if (entry.isIntersecting) {
          timer = setTimeout(() => {
            if (fired) return;
            fired = true;
            // Ticked optimistically, ahead of the round-trip. The write is
            // already best-effort, and making a checkmark wait on the network
            // is the wrong trade for something this incidental.
            if (!initiallyRead) markRead(chapterSlug, anchorId);
            fetch("/api/progress", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chapterId, sectionId }),
            }).catch(() => {
              // Best-effort — a missed progress write isn't worth surfacing to the reader.
            });
            observer.disconnect();
          }, 3000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [chapterId, sectionId, chapterSlug, anchorId, initiallyRead]);

  return <div ref={ref} aria-hidden="true" className="h-px" />;
}
