"use client";

import { useSyncExternalStore } from "react";
import { getProgress, getServerProgress, subscribe } from "@/lib/study/read-sections";

/**
 * A 2px fill along a rule that is already on screen — the tab rail's bottom
 * border on desktop, the mobile tab bar's top border on the phone.
 *
 * Those two are the only chrome that survives a forty-screen chapter at their
 * respective breakpoints; the chapter nav itself scrolls away on mobile at
 * about screen two. Occupying an existing border rather than adding an element
 * means nothing in the page reflows and the other six tabs are untouched —
 * this renders nothing at all unless a chapter is being read.
 *
 * It is driven by sections read, never by scroll position. Scroll depth is a
 * weaker claim than this app's definition of read (half-visible for three
 * continuous seconds), and showing both would leave the honest one looking
 * broken every time someone skimmed to the bottom.
 */
export function ChapterProgressFill({ edge }: { edge: "top" | "bottom" }) {
  const progress = useSyncExternalStore(subscribe, getProgress, getServerProgress);

  if (!progress || progress.total === 0) return null;

  const percent = Math.round((progress.read / progress.total) * 100);

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 h-0.5 ${
        edge === "top" ? "top-0" : "bottom-0"
      }`}
    >
      <span
        className="block h-full rounded-r-full bg-linear-to-r from-brand-500 to-brand-400 transition-[width] duration-700 ease-[var(--ease-out-expo)]"
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}
