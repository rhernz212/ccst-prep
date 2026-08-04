import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getExamMeta } from "@/lib/content/exam-content";
import { examTools } from "@/lib/content/exam-tools";
import { getReviewQueueStatus } from "@/lib/review/get-review-queue-status";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { ExamMobileTabBar, ExamTabNav } from "@/components/ui/ExamTabNav";
import { Badge } from "@/components/ui/Badge";

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
  //
  // getCurrentUser is cache()d for the render pass, so asking again here to
  // gate the Notes tab costs nothing beyond the call getReviewQueueStatus
  // already makes.
  const [reviewStatus, user] = await Promise.all([getReviewQueueStatus(), getCurrentUser()]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* No border-b: the sticky tab rail below carries it, so the two don't
          stack into a double rule while the header is still on screen. */}
      <header className="aura relative">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-600 dark:hover:text-brand-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            All certifications
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-fluid-2xl font-bold text-foreground">{exam.title}</h1>
            <Badge variant="brand">{exam.examCode}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {exam.vendor} · {exam.questionCount} questions · {exam.timeLimitMinutes} minutes
          </p>
        </div>
      </header>

      {/* Outside <header>, like the mobile bar but for a different reason: a
          sticky element can only stick within its parent's box, so nested in
          the header this would come unstuck as soon as the header scrolled
          away — which on a forty-screen chapter is almost immediately. */}
      <ExamTabNav
        examSlug={examSlug}
        reviewDueCount={reviewStatus?.dueCount ?? 0}
        tools={examTools(exam)}
        signedIn={user !== null}
      />

      {/* pb-tabbar clears the fixed mobile tab bar; it collapses back to normal
          padding at md, where that bar is replaced by the desktop pill rail. */}
      <main className="animate-fade-in-up pb-tabbar mx-auto w-full max-w-6xl grow px-4 py-8 md:pb-12">
        {children}
      </main>

      {/* Outside <header> on purpose: the header's `aura` opens a stacking
          context, and nested inside it this bar's z-40 lost to the page's
          positioned cards. See ExamMobileTabBar. */}
      <ExamMobileTabBar
        examSlug={examSlug}
        reviewDueCount={reviewStatus?.dueCount ?? 0}
        tools={examTools(exam)}
        signedIn={user !== null}
      />
    </div>
  );
}
