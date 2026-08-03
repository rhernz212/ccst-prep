import { notFound } from "next/navigation";
import { Clock, ListChecks, TriangleAlert } from "lucide-react";
import { getExamMeta } from "@/lib/content/exam-content";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { StartExamButton } from "@/components/exam/StartExamButton";
import { AttemptHistory, type PastAttempt } from "@/components/exam/AttemptHistory";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
  if (examRow) {
    const [{ data: domains }, { data: attemptRows }] = await Promise.all([
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
    ]);

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
