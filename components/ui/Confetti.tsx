"use client";

import { useEffect, useState, type CSSProperties } from "react";

const PIECES = 34;
const COLORS = [
  "var(--color-brand-500)",
  "var(--color-brand-400)",
  "var(--color-signal-400)",
  "var(--color-accent-400)",
  "var(--color-accent-500)",
  "var(--color-success-400)",
];

/**
 * One-shot celebration burst, CSS-animated and self-removing.
 *
 * Reserved for genuine milestones — a practice exam that hits the readiness
 * target — because confetti on every graded question is what tips a study
 * tool from encouraging into juvenile.
 *
 * Under `prefers-reduced-motion: reduce` the nodes are never mounted at all,
 * rather than being animated to a 0.01ms duration: 34 elements still cost a
 * layout pass, and a burst of colour appearing instantly is arguably worse
 * than no burst.
 */
export function Confetti({ fire }: { fire: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!fire) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Mounted on the next frame rather than synchronously, so the burst starts
    // after the score card itself has painted instead of racing it.
    const raf = requestAnimationFrame(() => setShow(true));
    const off = setTimeout(() => setShow(false), 1800);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(off);
    };
  }, [fire]);

  if (!show) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/3 z-10 overflow-visible">
      {Array.from({ length: PIECES }, (_, i) => {
        // Fan the pieces out across a wide arc, with the vertical throw
        // strongest in the middle so the burst reads as an explosion rather
        // than a curtain.
        const angle = (i / PIECES) * Math.PI - Math.PI / 2;
        const spread = 120 + ((i * 37) % 90);
        return (
          <span
            key={i}
            className="animate-burst absolute left-1/2 top-0 block h-3 w-1.5 rounded-[2px]"
            style={
              {
                background: COLORS[i % COLORS.length],
                animationDelay: `${(i % 8) * 22}ms`,
                "--dx": `${Math.sin(angle) * spread}px`,
                "--dy": `${-Math.abs(Math.cos(angle)) * spread - 40}px`,
                "--dr": `${(i % 2 ? 1 : -1) * (180 + ((i * 53) % 360))}deg`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
