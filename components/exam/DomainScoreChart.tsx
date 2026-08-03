import type { DomainBreakdownEntry } from "@/lib/exam/types";
import { ProgressBar } from "@/components/ui/ProgressBar";

/*
 * Each bar is tinted by how the learner actually did rather than all being
 * brand-coloured, so the weak domains are findable by scanning the colour
 * alone. The numeric label carries the same information for anyone who can't
 * use the colour.
 */
function fillFor(pct: number): string {
  if (pct >= 80) return "bg-linear-to-r from-success-500 to-success-400";
  if (pct >= 60) return "bg-linear-to-r from-accent-500 to-accent-400";
  return "bg-linear-to-r from-danger-500 to-danger-400";
}

export function DomainScoreChart({ byDomain }: { byDomain: DomainBreakdownEntry[] }) {
  return (
    <div className="space-y-4">
      {byDomain.map((d) => {
        const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
        return (
          <div key={d.domainCode}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 font-medium text-foreground">{d.domainTitle}</span>
              <span className="tabular shrink-0 text-muted-foreground">
                <span className="font-semibold text-foreground">{pct}%</span> · {d.correct}/
                {d.total}
              </span>
            </div>
            <ProgressBar value={pct} colorClassName={fillFor(pct)} />
          </div>
        );
      })}
    </div>
  );
}
