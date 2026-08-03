"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Conic-gradient progress ring — no SVG, no arc maths. The sweep is a
 * transition on `--ring-pct`, which only animates because that property is
 * registered with `@property` in globals.css; where that isn't supported the
 * ring renders at its final value instead of moving to it.
 *
 * The ring itself is a separate absolutely-positioned layer because the
 * utility's radial mask (the one punching the hole) would otherwise mask the
 * label sitting inside it too.
 *
 * The ring is decorative: the accessible reading comes from `label`, since a
 * gradient conveys nothing to a screen reader.
 */
export function ProgressRing({
  value,
  label,
  size = 72,
  thickness = 8,
  color = "var(--color-brand-500)",
  children,
  className = "",
}: {
  /** 0–100. */
  value: number;
  /** Spoken description, e.g. "Chapter 4, 72 percent read". */
  label: string;
  size?: number;
  thickness?: number;
  /** Any CSS colour — usually a chapter or domain hue token. */
  color?: string;
  /** Rendered in the hole. Usually the percentage as text. */
  children?: ReactNode;
  className?: string;
}) {
  // Start at zero and move to `value` after paint, so the sweep is visible.
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setPct(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div
      role="img"
      aria-label={label}
      className={`relative grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden="true"
        className="progress-ring absolute inset-0"
        style={
          {
            "--ring-pct": `${pct}%`,
            "--ring-w": `${thickness}px`,
            "--ring-color": color,
          } as CSSProperties
        }
      />
      <span aria-hidden="true" className="tabular relative text-sm font-semibold text-foreground">
        {children}
      </span>
    </div>
  );
}
