import { notFound } from "next/navigation";
import { ArrowRight, Clock, ListChecks, TriangleAlert } from "lucide-react";
import { getExamMeta } from "@/lib/content/exam-content";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { StartExamButton } from "@/components/exam/StartExamButton";
import { AttemptHistory, type PastAttempt } from "@/components/exam/AttemptHistory";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DomainBreakdownEntry } from "@/lib/exam/types";

export default async function ExamStartPage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  const supabase = await createClient();
  const [user, { data: examRow }] = await Promise.all([
    getCurrentUser(),
    supabase.from("exams").select("id").eq("slug", examSlug).maybeSingle(),
  ]);

  let domainTitles: string[] = [];
  let attempts: PastAttempt[] = [];
  let resumable: { id: string; minutesLeft: number } | null = null;
  if (examRow) {
    const [{ data: domains }, { data: attemptRows }, { data: openAttempts }] = await Promise.all([
      supabase
        .from("blueprint_domains")
        .select("title")
        .eq("exam_id", examRow.id)
        .order("order_index"),
      user
        ? supabase
            .from("exam_attempts")
            .select("id, status, score, submitted_at, domain_breakdown")
            .eq("user_id", user.id)
            .eq("exam_id", examRow.id)
            .neq("status", "in_progress")
            .order("submitted_at", { ascending: false })
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from("exam_attempts")
            .select("id, started_at, time_limit_minutes")
            .eq("user_id", user.id)
            .eq("exam_id", examRow.id)
            .eq("status", "in_progress")
            .order("started_at", { ascending: false })
            .limit(1)
        : Promise.resolve({ data: null }),
    ]);

    // Only offer to resume an attempt whose clock hasn't run out. An expired
    // one is deliberately left alone rather than auto-submitted: finalizing it
    // would post a near-zero score to the history for an exam nobody actually
    // sat, which is worse than an invisible orphan row.
    const open = openAttempts?.[0];
    if (open) {
      const elapsedMinutes =
        (new Date().getTime() - new Date(open.started_at).getTime()) / 60000;
      const minutesLeft = Math.ceil(open.time_limit_minutes - elapsedMinutes);
      if (minutesLeft > 0) resumable = { id: open.id, minutesLeft };
    }

    domainTitles = (domains ?? []).map((d) => d.title);
    attempts = (attemptRows ?? []).map((a) => ({
      id: a.id,
      status: a.status,
      score: a.score ?? 0,
      submittedAt: a.submitted_at,
      domainBreakdown: (a.domain_breakdown ?? []) as DomainBreakdownEntry[],
    }));
  }

  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl">
      <h2 className="text-fluid-xl font-semibold text-foreground">Full Practice Exam</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The real thing, timed and scored by blueprint domain.
      </p>

      {/* Above the start card, not below it: someone who closed the tab
          mid-exam is coming back for exactly this, and the primary button on
          this page would otherwise start a second attempt over the top of it. */}
      {resumable && (
        <Card className="mt-5 border-warning-300 p-5 dark:border-warning-500/40">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning-100 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300"
              aria-hidden="true"
            >
              <Clock className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-foreground">You have an exam in progress</div>
              <p className="tabular mt-0.5 text-sm text-muted-foreground">
                {resumable.minutesLeft} {resumable.minutesLeft === 1 ? "minute" : "minutes"} left on
                the clock — it keeps running whether or not this tab is open.
              </p>
            </div>
            <Button
              href={`/exams/${examSlug}/exam/run?attemptId=${resumable.id}`}
              className="ml-auto"
            >
              Resume
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </Card>
      )}

      <Card className="ring-gradient aura mt-5 overflow-hidden p-6">
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-sunken p-4">
            <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Time limit
            </dt>
            <dd className="tabular mt-1.5 font-display text-2xl font-bold text-foreground">
              {exam.timeLimitMinutes}
              <span className="ml-1 text-sm font-medium text-muted-foreground">min</span>
            </dd>
          </div>
          <div className="rounded-xl bg-surface-sunken p-4">
            <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
              Questions
            </dt>
            <dd className="tabular mt-1.5 font-display text-2xl font-bold text-foreground">
              {exam.questionCount}
            </dd>
          </div>
        </dl>

        {domainTitles.length > 0 && (
          <div className="mt-5">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Domains covered
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {domainTitles.map((title) => (
                <li key={title}>
                  <Badge variant="neutral">{title}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-5 flex items-start gap-2 rounded-lg border border-warning-300 bg-warning-50 p-3 text-xs text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Once started, the timer cannot be paused. You can navigate between questions freely and
            submit at any time — the exam auto-submits whatever you&apos;ve answered when time runs
            out.
          </span>
        </p>

        <div className="mt-6">
          <StartExamButton examSlug={examSlug} />
        </div>
      </Card>

      <AttemptHistory
        examSlug={examSlug}
        attempts={attempts}
        targetScore={exam.targetScore}
      />
    </div>
  );
}
