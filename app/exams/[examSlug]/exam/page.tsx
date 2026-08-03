import { notFound } from "next/navigation";
import { getExamMeta } from "@/lib/content/exam-content";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { StartExamButton } from "@/components/exam/StartExamButton";
import { AttemptHistory, type PastAttempt } from "@/components/exam/AttemptHistory";
import { Card } from "@/components/ui/Card";
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
    <div className="mx-auto max-w-2xl animate-fade-in-up">
      <h2 className="text-xl font-semibold text-foreground">Full Practice Exam</h2>
      <Card className="mt-4 p-6">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Time limit</dt>
            <dd className="text-lg font-semibold text-foreground">{exam.timeLimitMinutes} minutes</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Questions</dt>
            <dd className="text-lg font-semibold text-foreground">{exam.questionCount}</dd>
          </div>
        </dl>

        {domainTitles.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-muted-foreground">Domains covered</div>
            <ul className="mt-1 list-inside list-disc text-sm text-foreground">
              {domainTitles.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Once started, the timer cannot be paused. You can navigate between questions freely and
          submit at any time — the exam auto-submits whatever you&apos;ve answered when time runs out.
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
