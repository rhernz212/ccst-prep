"use client";

import { useEffect, useState } from "react";

/**
 * Counts from zero to `value` once on mount.
 *
 * Done in JS rather than with the `@property` + `counter()` CSS trick because
 * that technique degrades to rendering `0` wherever registered properties
 * aren't animatable, and a permanently wrong score is a far worse failure than
 * a score that doesn't animate.
 *
 * Callers render this inside an `aria-hidden` region with the true value
 * exposed some other way (ProgressRing's `aria-label`), so the intermediate
 * numbers are never announced.
 */
export function CountUp({
  value,
  duration = 900,
  className = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Reduced motion still goes through rAF rather than a synchronous
    // setState: it lands on the true value on the very next frame, which is
    // indistinguishable from setting it immediately.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (reduced) {
        setDisplay(value);
        return;
      }
      const t = Math.min(1, (now - start) / duration);
      // Matches --ease-out-expo, so the digits settle on the same curve as the
      // ring sweeping behind them.
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={`tabular ${className}`}>
      {display}
      {suffix}
    </span>
  );
}
