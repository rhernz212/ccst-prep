import Link from "next/link";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  interactive?: boolean;
  href?: string;
  className?: string;
}

const BASE = "rounded-lg border border-border bg-surface shadow-xs dark:shadow-none";
const INTERACTIVE =
  "transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:hover:border-brand-500";

export function Card({ children, interactive = false, href, className = "" }: CardProps) {
  const classes = `${BASE} ${interactive ? INTERACTIVE : ""} ${className}`;

  if (href) {
    return (
      <Link href={href} className={`block ${classes}`}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}
