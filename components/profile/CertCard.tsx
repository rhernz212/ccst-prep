import Link from "next/link";
import { ArrowRight, BookOpen, NotebookPen, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScoreVerdict } from "@/components/exam/ScoreVerdict";
import { ExamDateForm } from "./ExamDateForm";
import type { CertProgress } from "@/lib/profile/get-profile-data";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-sunken p-3.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="tabular mt-1 font-display text-2xl font-bold text-foreground">{children}</dd>
    </div>
  );
}

export function CertCard({ cert }: { cert: CertProgress }) {
  const coverage =
    cert.sectionTotal > 0 ? Math.round((cert.sectionsRead / cert.sectionTotal) * 100) : 0;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="font-display text-lg font-semibold text-foreground">{cert.title}</h3>
        <Badge variant="brand">{cert.examCode}</Badge>
        {cert.trend && (
          <span className="ml-auto">
            <ScoreVerdict
              score={cert.trend.best}
              targetScore={cert.targetScore}
              showTarget={false}
            />
          </span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Best score">{cert.trend ? `${Math.round(cert.trend.best * 100)}%` : "—"}</Stat>
        <Stat label="Latest">{cert.trend ? `${Math.round(cert.trend.latest * 100)}%` : "—"}</Stat>
        <Stat label="Attempts">{cert.trend?.attemptCount ?? 0}</Stat>
        <Stat label="Book read">{coverage}%</Stat>
      </dl>

      <div className="mt-4">
        <p className="tabular mb-1.5 text-xs text-muted-foreground">
          {cert.sectionsRead} of {cert.sectionTotal} sections read
        </p>
        <ProgressBar value={coverage} size="sm" />
      </div>

      {/* The one panel here that tells you what to do next, so it gets the
          space. Aggregated across every attempt rather than read off the
          latest one — see aggregateDomainPerformance. */}
      {cert.weakestDomains.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="text-sm font-medium text-foreground">Weakest domains</div>
          <ul className="mt-2.5 space-y-2">
            {cert.weakestDomains.map((domain) => (
              <li key={domain.domainCode} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {domain.domainTitle}
                </span>
                <span className="w-24 shrink-0 sm:w-32">
                  <ProgressBar
                    value={Math.round(domain.ratio * 100)}
                    size="sm"
                    colorClassName={
                      domain.ratio >= (cert.targetScore ?? 0.8)
                        ? "bg-linear-to-r from-success-500 to-success-400"
                        : "bg-linear-to-r from-warning-500 to-warning-400"
                    }
                  />
                </span>
                <span className="tabular w-14 shrink-0 text-right font-medium text-foreground">
                  {Math.round(domain.ratio * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ExamDateForm examSlug={cert.slug} examDate={cert.examDate} />

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4 text-sm">
        <QuickLink href={`/exams/${cert.slug}/study`} icon={BookOpen} label="Study" />
        <QuickLink
          href={`/exams/${cert.slug}/review`}
          icon={RefreshCw}
          label={cert.reviewDue > 0 ? `Review (${cert.reviewDue} due)` : "Review"}
          emphasis={cert.reviewDue > 0}
        />
        <QuickLink
          href={`/exams/${cert.slug}/notes`}
          icon={NotebookPen}
          label={`Notes (${cert.notesCount})`}
        />
        <Link
          href={`/exams/${cert.slug}/exam`}
          className="group ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-brand-600 transition-colors hover:bg-surface-hover dark:text-brand-400"
        >
          Practice exam
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-200 ease-[var(--ease-spring)] group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </Card>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  emphasis = false,
}: {
  href: string;
  icon: typeof BookOpen;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-surface-hover ${
        emphasis ? "font-medium text-accent-700 dark:text-accent-300" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Link>
  );
}
