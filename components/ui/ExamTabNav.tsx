"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Calculator,
  GraduationCap,
  ListChecks,
  NotebookPen,
  RefreshCw,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";
import type { ExamTool } from "@/lib/content/types";

interface Tab {
  slug: string;
  label: string;
  /** Shortened for the mobile bar, where up to seven labels have to fit across 375px. */
  shortLabel: string;
  icon: LucideIcon;
  /** Present only for exams that list this tool in meta.json. */
  tool?: ExamTool;
  /** Tabs that only hold user-owned data, hidden entirely when signed out. */
  requiresAuth?: boolean;
}

const TABS: Tab[] = [
  { slug: "study", label: "Study Material", shortLabel: "Study", icon: BookOpen },
  { slug: "quizzes", label: "Practice Quizzes", shortLabel: "Quizzes", icon: ListChecks },
  { slug: "review", label: "Review", shortLabel: "Review", icon: RefreshCw },
  { slug: "notes", label: "Notes", shortLabel: "Notes", icon: NotebookPen, requiresAuth: true },
  { slug: "subnetting", label: "Subnetting", shortLabel: "Subnet", icon: Calculator, tool: "subnetting" },
  { slug: "cli", label: "CLI Practice", shortLabel: "CLI", icon: TerminalSquare, tool: "cli" },
  { slug: "exam", label: "Full Practice Exam", shortLabel: "Exam", icon: GraduationCap },
];

// Tailwind needs literal class names, so the mobile bar's column count is
// looked up rather than interpolated.
const GRID_COLS: Record<number, string> = {
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
};

interface TabNavProps {
  examSlug: string;
  /** Questions due in the spaced-repetition queue; badged on the Review tab. */
  reviewDueCount?: number;
  /** Tool tabs this exam offers, from meta.json. */
  tools?: readonly ExamTool[];
  /** Gates auth-only tabs. Signed-out visitors never see Notes at all. */
  signedIn?: boolean;
}

function visibleTabs(tools: readonly ExamTool[] | undefined, signedIn: boolean): Tab[] {
  return TABS.filter((tab) => {
    if (tab.requiresAuth && !signedIn) return false;
    if (tab.tool !== undefined && tools !== undefined && !tools.includes(tab.tool)) return false;
    return true;
  });
}

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

function useIsActive(examSlug: string) {
  const pathname = usePathname();
  return (slug: string) => pathname.startsWith(`/exams/${examSlug}/${slug}`);
}

/**
 * Desktop: a pill rail rather than an underline row. The active pill is a
 * raised surface sitting in a sunken track, which survives being glanced at
 * across a wide viewport far better than a 2px underline does.
 *
 * Sticks beneath the app header, because a chapter page runs to forty-odd
 * screens and the rail used to scroll away for good — reaching another tab
 * meant scrolling the whole way back up. That also dictates where this is
 * mounted: a sticky element is confined to its parent's box, so rendered
 * inside the exam header it would unstick the moment that header scrolled
 * past. Like ExamMobileTabBar, it has to be the header's sibling.
 *
 * Sits at z-30 under the app header's z-40, and its top 1px tucks behind that
 * header's bottom border so no sliver of content shows between the two.
 */
export function ExamTabNav({
  examSlug,
  reviewDueCount = 0,
  tools,
  signedIn = false,
}: TabNavProps) {
  const isActive = useIsActive(examSlug);

  return (
    <div className="glass sticky top-14 z-30 hidden border-b border-border md:block">
      <nav aria-label="Exam sections" className="mx-auto max-w-6xl px-4 py-2.5">
        <div className="inline-flex gap-1 rounded-xl border border-border bg-surface-sunken p-1">
          {visibleTabs(tools, signedIn).map((tab) => {
            const active = isActive(tab.slug);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.slug}
                href={`/exams/${examSlug}/${tab.slug}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 ease-[var(--ease-spring)] active:scale-[0.97] lg:px-3.5 ${
                  active
                    ? "surface-card text-brand-700 dark:text-brand-300"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? "text-brand-500 dark:text-brand-400" : ""}`}
                  aria-hidden="true"
                />
                {/* Seven full labels don't fit on one line until ~1200px, and a
                    rail that wraps to two lines is 89px of permanently sticky
                    chrome. Below lg the mobile bar's short labels stand in;
                    whitespace-nowrap keeps either from wrapping. */}
                <span className="lg:hidden">{tab.shortLabel}</span>
                <span className="hidden lg:inline">{tab.label}</span>
                {tab.slug === "review" && reviewDueCount > 0 && <DueBadge count={reviewDueCount} />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/**
 * Mobile: a fixed thumb-zone bar, replacing a horizontally-scrolled strip whose
 * last two tabs sat off-screen and undiscoverable. Seven items (signed in, with
 * both tool tabs) is well over the usual five-item guideline, so labels are
 * shortened and the icons carry most of the recognition — but the labels stay,
 * because icon-only navigation is both a recognition and an accessibility
 * problem. At 375px seven columns leave ~53px each, which fits the longest
 * short label ("Quizzes"); an eighth tab would not, and should push this to an
 * overflow "More" item rather than shrinking the type further.
 *
 * Must be rendered as a sibling of the exam header, never inside it. The
 * header carries `aura`, whose `isolation: isolate` opens a stacking context;
 * nested in there, this bar's z-40 could only compete with the header's own
 * children, so the page's `relative` cards — later in the DOM at the same
 * stacking level — painted over it and swallowed every tap.
 *
 * `pb-tabbar` on the page wrapper reserves the space this occupies so the last
 * card isn't trapped underneath it.
 */
export function ExamMobileTabBar({
  examSlug,
  reviewDueCount = 0,
  tools,
  signedIn = false,
}: TabNavProps) {
  const isActive = useIsActive(examSlug);
  const tabs = visibleTabs(tools, signedIn);

  return (
    <nav
      aria-label="Exam sections"
      className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border md:hidden"
    >
      <div className={`grid ${GRID_COLS[tabs.length] ?? "grid-cols-6"}`}>
        {tabs.map((tab) => {
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
              {/* The active marker sits above the icon rather than under it, so
                  it isn't hidden by the thumb that just tapped. */}
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
  );
}
