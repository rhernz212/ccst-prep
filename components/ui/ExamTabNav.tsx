"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calculator,
  GraduationCap,
  ListChecks,
  RefreshCw,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";

interface Tab {
  slug: string;
  label: string;
  /** Shortened for the mobile bar, where six labels have to fit across 375px. */
  shortLabel: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { slug: "study", label: "Study Material", shortLabel: "Study", icon: BookOpen },
  { slug: "quizzes", label: "Practice Quizzes", shortLabel: "Quizzes", icon: ListChecks },
  { slug: "review", label: "Review", shortLabel: "Review", icon: RefreshCw },
  { slug: "subnetting", label: "Subnetting", shortLabel: "Subnet", icon: Calculator },
  { slug: "cli", label: "CLI Practice", shortLabel: "CLI", icon: TerminalSquare },
  { slug: "exam", label: "Full Practice Exam", shortLabel: "Exam", icon: GraduationCap },
];

function DueBadge({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span
      className={`tabular inline-flex min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 py-0.5 text-[0.6875rem] leading-none font-bold text-accent-900 ${className}`}
      aria-label={`${count} due`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function ExamTabNav({
  examSlug,
  reviewDueCount = 0,
}: {
  examSlug: string;
  /** Questions due in the spaced-repetition queue; badged on the Review tab. */
  reviewDueCount?: number;
}) {
  const pathname = usePathname();
  const isActive = (slug: string) => pathname.startsWith(`/exams/${examSlug}/${slug}`);

  return (
    <>
      {/*
        Desktop: a pill rail rather than an underline row. The active pill is a
        raised surface sitting in a sunken track, which survives being glanced
        at across a wide viewport far better than a 2px underline does.
      */}
      <nav aria-label="Exam sections" className="mx-auto hidden max-w-6xl px-4 pb-3 md:block">
        <div className="inline-flex gap-1 rounded-xl border border-border bg-surface-sunken p-1">
          {TABS.map((tab) => {
            const active = isActive(tab.slug);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.slug}
                href={`/exams/${examSlug}/${tab.slug}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-200 ease-[var(--ease-spring)] active:scale-[0.97] ${
                  active
                    ? "surface-card text-brand-700 dark:text-brand-300"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${active ? "text-brand-500 dark:text-brand-400" : ""}`}
                  aria-hidden="true"
                />
                {tab.label}
                {tab.slug === "review" && reviewDueCount > 0 && <DueBadge count={reviewDueCount} />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/*
        Mobile: a fixed thumb-zone bar, replacing a horizontally-scrolled strip
        whose last two tabs sat off-screen and undiscoverable. Six items is one
        over the usual five-item guideline, so labels are shortened and the
        icons carry most of the recognition — but the labels stay, because
        icon-only navigation is both a recognition and an accessibility
        problem. `pb-tabbar` on the page wrapper reserves the space this
        occupies so the last card isn't trapped underneath it.
      */}
      <nav
        aria-label="Exam sections"
        className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border md:hidden"
      >
        <div className="grid grid-cols-6">
          {TABS.map((tab) => {
            const active = isActive(tab.slug);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.slug}
                href={`/exams/${examSlug}/${tab.slug}`}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-13 flex-col items-center justify-center gap-1 px-0.5 pt-2 pb-1 transition-colors ${
                  active ? "text-brand-600 dark:text-brand-400" : "text-muted-foreground"
                }`}
              >
                {/* The active marker sits above the icon rather than under it,
                    so it isn't hidden by the thumb that just tapped. */}
                <span
                  aria-hidden="true"
                  className={`absolute top-0 h-0.5 w-8 rounded-full bg-brand-500 transition-opacity duration-200 dark:bg-brand-400 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {tab.slug === "review" && reviewDueCount > 0 && (
                    <DueBadge count={reviewDueCount} className="absolute -top-1.5 -right-2.5" />
                  )}
                </span>
                <span className="text-[0.625rem] leading-none font-medium">{tab.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
