import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "success" | "secondary" | "subtle" | "ghost";
type Size = "sm" | "md" | "lg";

/*
 * Every size is at least 36px tall and md/lg clear 44px, so the primary action
 * on any screen is a comfortable thumb target. The spring easing plus the
 * lift-then-press is the entire "feels alive" budget for buttons — it resolves
 * in 200ms and gets out of the way.
 */
const BASE = [
  "relative inline-flex select-none items-center justify-center gap-2 rounded-lg",
  "text-sm font-semibold whitespace-nowrap",
  "transition-[transform,box-shadow,background-color,border-color] duration-200 ease-[var(--ease-spring)]",
  "active:scale-[0.97] active:duration-75",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: [
    "bg-linear-to-b from-brand-500 to-brand-600 text-white shadow-raised",
    "hover:-translate-y-0.5 hover:from-brand-400 hover:to-brand-500 hover:shadow-brand",
  ].join(" "),
  success: [
    "bg-linear-to-b from-success-500 to-success-600 text-white shadow-raised",
    "hover:-translate-y-0.5 hover:from-success-400 hover:to-success-500 hover:shadow-success",
  ].join(" "),
  secondary: [
    "surface-card text-foreground",
    "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:hover:border-brand-500/70",
  ].join(" "),
  subtle: "bg-surface-hover text-foreground hover:bg-border/70",
  ghost: "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-9 px-3.5",
  md: "h-11 px-5",
  lg: "h-12.5 px-7 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  href?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  href,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const classes = `${BASE} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
