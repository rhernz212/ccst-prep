import type { InputHTMLAttributes } from "react";

/*
 * h-11 rather than padding-derived height: it guarantees a 44px touch target,
 * and keeps inputs and buttons on the same baseline when they sit side by side
 * in a form row. The 16px base font size is deliberate — iOS Safari zooms the
 * whole page in on focus for anything smaller, and only steps down to 14px
 * once there's a pointer-precise viewport to justify it.
 */
export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 rounded-lg border border-border bg-surface px-3.5 text-base text-foreground shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 focus:border-brand-400 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-brand-500)_18%,transparent)] focus:outline-none disabled:opacity-60 sm:text-sm dark:bg-surface-sunken ${className}`}
      {...props}
    />
  );
}
