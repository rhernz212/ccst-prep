import type { ReactNode } from "react";

type Variant = "neutral" | "brand" | "signal" | "accent" | "success" | "danger" | "warning";

/*
 * Tinted rather than filled: a badge sits inside a card that already has a
 * border and a shadow, so a solid fill competes with the card's own edge.
 * The `/…` alphas on the dark values keep the tint sitting on the surface
 * rather than punching a saturated hole in it.
 */
const VARIANT_CLASSES: Record<Variant, string> = {
  neutral: "border-border bg-surface-hover text-muted-foreground",
  brand:
    "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300",
  signal:
    "border-signal-200 bg-signal-50 text-signal-700 dark:border-signal-500/30 dark:bg-signal-500/15 dark:text-signal-300",
  accent:
    "border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-500/30 dark:bg-accent-500/15 dark:text-accent-300",
  success:
    "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-300",
  danger:
    "border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/15 dark:text-danger-300",
  warning:
    "border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-300",
};

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
