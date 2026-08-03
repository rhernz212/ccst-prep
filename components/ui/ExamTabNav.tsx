"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "study", label: "Study Material" },
  { slug: "quizzes", label: "Practice Quizzes" },
  { slug: "review", label: "Review" },
  { slug: "subnetting", label: "Subnetting" },
  { slug: "cli", label: "CLI Practice" },
  { slug: "exam", label: "Full Practice Exam" },
];

export function ExamTabNav({
  examSlug,
  reviewDueCount = 0,
}: {
  examSlug: string;
  /** Questions due in the spaced-repetition queue; badged on the Review tab. */
  reviewDueCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
      {TABS.map((tab) => {
        const href = `/exams/${examSlug}/${tab.slug}`;
        const active = pathname.startsWith(href);
        const showBadge = tab.slug === "review" && reviewDueCount > 0;
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-brand-600 font-medium text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {showBadge && (
              <span
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-medium text-white"
                aria-label={`${reviewDueCount} due`}
              >
                {reviewDueCount > 99 ? "99+" : reviewDueCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
