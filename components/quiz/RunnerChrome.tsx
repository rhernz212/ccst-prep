"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * The progress strip that sits above a run of questions. Sticky under the app
 * header, so on a phone — where the question itself can be taller than the
 * viewport — the position in the set never scrolls out of reach.
 *
 * `top-14` matches the app header's height so the two stack rather than
 * overlap.
 */
export function RunnerProgress({
  index,
  total,
  answeredCount,
  children,
}: {
  index: number;
  total: number;
  answeredCount?: number;
  /** Slot on the right — the exam timer goes here. */
  children?: ReactNode;
}) {
  const pct = ((index + 1) / total) * 100;

  return (
    <div className="glass sticky top-14 z-30 -mx-4 mb-5 border-b border-border px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="tabular text-sm font-semibold text-foreground">
          Question {index + 1}
          <span className="font-normal text-muted-foreground"> of {total}</span>
        </span>
        <div className="flex items-center gap-3">
          {answeredCount !== undefined && (
            <span className="tabular text-xs text-muted-foreground">
              {answeredCount} answered
            </span>
          )}
          {children}
        </div>
      </div>
      {/* Not the ProgressBar component: this one tracks position in the set
          rather than a score, so it wants an instant, linear response to
          Next/Previous rather than a spring and a sheen. */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-hover dark:bg-surface-sunken">
        <div
          className="h-1 rounded-full bg-linear-to-r from-brand-500 to-signal-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Previous / primary-action footer. Buttons go full-width and stack the
 * primary action on the right on phones, where a 44px target that spans half
 * the screen is much easier to hit than a centred pair.
 */
export function RunnerNav({
  onPrevious,
  previousDisabled,
  children,
}: {
  onPrevious: () => void;
  previousDisabled: boolean;
  /** The primary action — Check / Next / Submit. */
  children: ReactNode;
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <Button
        variant="secondary"
        onClick={onPrevious}
        disabled={previousDisabled}
        className="flex-1 sm:flex-initial"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </Button>
      <div className="flex flex-1 justify-end [&>*]:flex-1 sm:[&>*]:flex-initial">{children}</div>
    </div>
  );
}

/** Chevron for the Next button, kept here so the runners share one import. */
export function NextIcon() {
  return <ChevronRight className="h-4 w-4" aria-hidden="true" />;
}
