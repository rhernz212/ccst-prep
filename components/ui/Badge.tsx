import type { ReactNode } from "react";

type Variant = "neutral" | "brand" | "success";

const VARIANT_CLASSES: Record<Variant, string> = {
  neutral: "bg-surface text-muted-foreground border border-border",
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  success: "bg-success-50 text-success-700 dark:bg-success-900 dark:text-success-300",
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
