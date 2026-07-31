import type { DomainBreakdownEntry } from "@/lib/exam/types";

export function DomainScoreChart({ byDomain }: { byDomain: DomainBreakdownEntry[] }) {
  return (
    <div className="space-y-3">
      {byDomain.map((d) => {
        const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
        return (
          <div key={d.domainCode}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-700">{d.domainTitle}</span>
              <span className="text-gray-500">
                {d.correct}/{d.total} ({pct}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
