"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "study", label: "Study Material" },
  { slug: "quizzes", label: "Practice Quizzes" },
  { slug: "subnetting", label: "Subnetting" },
  { slug: "cli", label: "CLI Practice" },
  { slug: "exam", label: "Full Practice Exam" },
];

export function ExamTabNav({ examSlug }: { examSlug: string }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
      {TABS.map((tab) => {
        const href = `/exams/${examSlug}/${tab.slug}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-blue-600 font-medium text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
