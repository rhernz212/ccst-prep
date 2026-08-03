import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getExamMeta } from "@/lib/content/exam-content";
import { getReviewQueueStatus } from "@/lib/review/get-review-queue-status";
import { ExamTabNav } from "@/components/ui/ExamTabNav";

export default async function ExamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  // Two cheap head-only counts, and only for signed-in users — see
  // getReviewQueueStatus. Lives in the layout so the badge shows on every
  // tab, not just Review.
  const reviewStatus = await getReviewQueueStatus();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-brand-600 dark:hover:text-brand-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All certifications
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{exam.title}</h1>
          <p className="mb-3 text-sm text-muted-foreground">
            {exam.vendor} · {exam.examCode}
          </p>
        </div>
        <ExamTabNav examSlug={examSlug} reviewDueCount={reviewStatus?.dueCount ?? 0} />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 animate-fade-in-up">{children}</main>
    </div>
  );
}
