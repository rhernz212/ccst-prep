"use client";

import { useEffect, useState } from "react";
import { Lamp, MoonStar, Sunset } from "lucide-react";

/**
 * Lantern mode: a warm, low-glare reading tint for late-night chapters.
 *
 * It retints the whole document rather than just the article. The article is
 * what it's *for*, but a sepia column of text framed by a bright white header
 * and tab rail is worse than either treatment on its own — the frame is
 * exactly what's glaring at 1am.
 *
 * Dark mode is left alone as a separate axis: `.dark[data-reader-tint]` warms
 * the dark palette instead of replacing it, so switching the lantern on never
 * silently undoes the theme, and every `dark:` utility in the app still lines
 * up with the surface it's painted on.
 *
 * The mode lives in localStorage and is applied by the root layout's inline
 * script before first paint — this control only writes it.
 */

type TintMode = "off" | "auto" | "on";

const STORAGE_KEY = "readerTint";

/**
 * The auto window. Kept in step with the same two numbers in the root
 * layout's no-FOUC script — if these move, that moves too, or the tint will
 * flash off on load for an hour at each end.
 */
const LANTERN_FROM_HOUR = 21;
const LANTERN_UNTIL_HOUR = 6;

/** Re-checked while the page sits open, so 9pm arrives without a reload. */
const AUTO_POLL_MS = 60_000;

const OPTIONS: { mode: TintMode; label: string; icon: typeof Lamp }[] = [
  { mode: "off", label: "Lantern off", icon: Lamp },
  { mode: "auto", label: `Lantern after ${LANTERN_FROM_HOUR - 12}pm`, icon: Sunset },
  { mode: "on", label: "Lantern on", icon: MoonStar },
];

function isLateNight(): boolean {
  const hour = new Date().getHours();
  return hour >= LANTERN_FROM_HOUR || hour < LANTERN_UNTIL_HOUR;
}

function applyTint(mode: TintMode) {
  const lit = mode === "on" || (mode === "auto" && isLateNight());
  if (lit) document.documentElement.dataset.readerTint = "sepia";
  else delete document.documentElement.dataset.readerTint;
}

export function ReaderTint() {
  const [mode, setMode] = useState<TintMode>("off");

  // Deliberate one-time client-only setState, matching ThemeToggle: the
  // stored mode was already applied to <html> by the inline script, and
  // reading it during render would be a hydration mismatch, since the server
  // can't know it.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "on" || stored === "auto") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    applyTint(mode);
    if (mode !== "auto") return;

    // Auto has to keep watching the clock: a chapter can easily be open from
    // half eight to midnight, and the point of auto is that it comes on by
    // itself. The visibility listener covers a laptop that was asleep, where
    // the interval hasn't been firing.
    const onVisible = () => applyTint("auto");
    const timer = setInterval(onVisible, AUTO_POLL_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mode]);

  function choose(next: TintMode) {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or a full quota — the tint still applies for this page,
      // it just won't be remembered. Not worth telling the reader about.
    }
  }

  return (
    <div
      role="group"
      aria-label="Lantern mode"
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5 shadow-xs"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = mode === option.mode;

        return (
          <button
            key={option.mode}
            type="button"
            onClick={() => choose(option.mode)}
            aria-pressed={active}
            title={option.label}
            className={`grid h-8 w-8 place-items-center rounded-full transition-[background-color,color,transform] duration-200 ease-[var(--ease-spring)] active:scale-90 ${
              active
                ? "bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
