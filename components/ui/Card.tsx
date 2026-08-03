import Link from "next/link";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  interactive?: boolean;
  href?: string;
  /** Drops the surface/border so the card is only a rounded, padded region. */
  bare?: boolean;
  className?: string;
}

const BASE = "surface-card relative rounded-xl";

/*
 * Two things carry the interactive state: the lift, and the border warming to
 * brand. Tailwind v4 already scopes `hover:` to `(hover: hover)`, so a phone
 * tap can't get stuck in the lifted state — the press scale is what touch
 * gets instead.
 */
const INTERACTIVE = [
  "transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-spring)]",
  "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md",
  "dark:hover:border-brand-500/70",
  "active:translate-y-0 active:scale-[0.99] active:duration-75",
].join(" ");

export function Card({
  children,
  interactive = false,
  href,
  bare = false,
  className = "",
}: CardProps) {
  const classes = [bare ? "relative rounded-xl" : BASE, interactive ? INTERACTIVE : "", className]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={`block ${classes}`}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}
