"use client";

import type { ReactNode } from "react";
import { ProgressRing } from "./ProgressRing";
import { CountUp } from "./CountUp";
import { Confetti } from "./Confetti";

/**
 * The big result moment, shared by quiz, review and exam results.
 *
 * The ring sweeps, the digits count up on the same easing, and the ring's
 * colour is derived from the score itself, so the reader knows roughly how
 * they did before reading a single number. Confetti fires only when
 * `celebrate` is set — reserved for the practice exam hitting its readiness
 * target, not for every graded quiz.
 */
export function ScoreDial({
  score,
  caption,
  detail,
  celebrate = false,
}: {
  /** 0–1. */
  score: number;
  /** Small line above the number, e.g. the chapter title. */
  caption?: ReactNode;
  /** Small line below the number, e.g. "18 of 24 correct". */
  detail?: ReactNode;
  celebrate?: boolean;
}) {
  const pct = Math.round(score * 100);

  const color =
    pct >= 80
      ? "var(--color-success-500)"
      : pct >= 60
        ? "var(--color-accent-500)"
        : "var(--color-danger-500)";

  return (
    <div className="relative flex flex-col items-center">
      <Confetti fire={celebrate} />

      {caption && (
        <div className="mb-4 text-center text-sm font-medium text-muted-foreground">{caption}</div>
      )}

      <ProgressRing
        value={pct}
        label={`Score: ${pct} percent`}
        size={168}
        thickness={14}
        color={color}
      >
        <span className="flex flex-col items-center">
          <span className="font-display text-5xl leading-none font-bold text-foreground">
            <CountUp value={pct} suffix="%" />
          </span>
        </span>
      </ProgressRing>

      {detail && <div className="mt-4 text-center text-sm text-muted-foreground">{detail}</div>}
    </div>
  );
}
