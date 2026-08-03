import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ScoreVerdict } from "./ScoreVerdict";
import {
  aggregateDomainPerformance,
  summarizeTrend,
} from "@/lib/domain/exam/attemptHistory";
import type { DomainBreakdownEntry } from "@/lib/exam/types";

export interface PastAttempt {
  id: string;
  status: string;
  score: number;
  submittedAt: string | null;
  domainBreakdown: DomainBreakdownEntry[];
}

const WEAKEST_DOMAINS_SHOWN = 3;

export function AttemptHistory({
  examSlug,
  attempts,
  targetScore,
}: {
  examSlug: string;
  attempts: PastAttempt[];
  targetScore?: number;
}) {
  // attempts arrive newest-first
  const trend = summarizeTrend(attempts);
  if (!trend) return null;

  const weakest = aggregateDomainPerformance(attempts).slice(0, WEAKEST_DOMAINS_SHOWN);

  return (
    <div className="mt-8">
      <h3 className="mb-3 text-lg font-semibold text-foreground">Your attempts</h3>

      <Card className="p-5">
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Attempts</dt>
            <dd className="text-lg font-semibold text-foreground">{trend.attemptCount}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Best</dt>
            <dd className="text-lg font-semibold text-foreground">
              {Math.round(trend.best * 100)}%
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Latest</dt>
            <dd className="flex items-baseline gap-1.5 text-lg font-semibold text-foreground">
              {Math.round(trend.latest * 100)}%
              {trend.delta !== null && Math.abs(trend.delta) >= 0.005 && (
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                    trend.delta > 0
                      ? "text-success-600 dark:text-success-400"
                      : "text-danger-600 dark:text-danger-400"
                  }`}
                >
                  {trend.delta > 0 ? (
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                  )}
                  {trend.delta > 0 ? "+" : ""}
                  {Math.round(trend.delta * 100)}
                  <span className="sr-only"> points versus the previous attempt</span>
                </span>
              )}
            </dd>
          </div>
        </dl>

        {weakest.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="text-sm font-medium text-foreground">
              Weakest domains across all attempts
            </div>
            <ul className="mt-2 space-y-1.5">
              {weakest.map((d) => (
                <li key={d.domainCode} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="min-w-0 text-muted-foreground">{d.domainTitle}</span>
                  <span className="shrink-0 font-medium text-foreground">
                    {Math.round(d.ratio * 100)}%
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({d.correct}/{d.total})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <ul className="mt-3 space-y-2">
        {attempts.map((attempt) => (
          <li key={attempt.id}>
            <Card
              href={`/exams/${examSlug}/exam/${attempt.id}/results`}
              interactive
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <div className="font-medium text-foreground">
                  {Math.round(attempt.score * 100)}%
                  {attempt.status === "timed_out" && (
                    <span className="ml-2 text-xs font-normal text-warning-700 dark:text-warning-400">
                      timed out
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {attempt.submittedAt
                    ? new Date(attempt.submittedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "Not submitted"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <ScoreVerdict score={attempt.score} targetScore={targetScore} showTarget={false} />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
