"use client";

import { useEffect, useRef } from "react";

/**
 * Invisible sentinel placed at the end of a section. Once it's been at
 * least half-visible for 3 continuous seconds, records the section as read.
 * Fires at most once per mount (page load) — cheap and good enough; no need
 * to debounce repeat scrolls back into view.
 */
export function ReadingProgressMarker({
  chapterId,
  sectionId,
}: {
  chapterId: string;
  sectionId: string;
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
  }, [chapterId, sectionId]);

  return <div ref={ref} aria-hidden="true" className="h-px" />;
}
