import type { DomainBreakdownEntry } from "@/lib/exam/types";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function DomainScoreChart({ byDomain }: { byDomain: DomainBreakdownEntry[] }) {
  return (
    <div className="space-y-3">
      {byDomain.map((d) => {
        const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
        return (
          <div key={d.domainCode}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-foreground">{d.domainTitle}</span>
              <span className="text-muted-foreground">
                {d.correct}/{d.total} ({pct}%)
              </span>
            </div>
            <ProgressBar value={pct} />
          </div>
        );
      })}
    </div>
  );
}
