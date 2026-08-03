"use client";

import { useEffect, useState } from "react";

/**
 * Fills from zero on mount, so a score bar visibly grows into place rather
 * than appearing already full. A sheen sweeps once across the filled track as
 * it settles — a one-shot highlight, not a loop.
 *
 * `colorClassName` carries the whole fill treatment (gradient and any glow),
 * so callers can tint a bar per domain or per chapter without this component
 * knowing about those palettes.
 */
export function ProgressBar({
  value,
  colorClassName = "bg-linear-to-r from-brand-500 to-brand-400",
  size = "md",
}: {
  value: number;
  colorClassName?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const track = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" }[size];

  return (
    <div className={`${track} w-full overflow-hidden rounded-full bg-surface-hover dark:bg-surface-sunken`}>
      <div
        className={`${track} relative overflow-hidden rounded-full transition-[width] duration-700 ease-[var(--ease-out-expo)] ${colorClassName}`}
        style={{ width: `${width}%` }}
      >
        <span className="sheen animate-sheen absolute inset-0" />
      </div>
    </div>
  );
}
