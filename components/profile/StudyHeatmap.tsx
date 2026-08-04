import type { HeatmapCell } from "@/lib/domain/profile/studyActivity";

/*
 * Four steps rather than a continuous scale: the counts here are "things you
 * did today" (sections read, quizzes started), which cluster in the low
 * single digits, so a smooth ramp would render almost every active day as the
 * same colour anyway.
 */
const LEVEL_CLASSES = [
  "bg-surface-hover dark:bg-surface-sunken",
  "bg-brand-200 dark:bg-brand-500/30",
  "bg-brand-400 dark:bg-brand-500/60",
  "bg-brand-600 dark:bg-brand-400",
];

function levelOf(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

function formatDay(dayKey: string): string {
  // Parsed as UTC and formatted in UTC — the key is already a local calendar
  // date, so letting the runtime re-interpret it in its own zone would shift
  // half the labels by a day.
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

export function StudyHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const past = cells.filter((cell) => !cell.isFuture);
  const activeDays = past.filter((cell) => cell.count > 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold text-foreground">Last 6 months</h3>
        <p className="tabular text-xs text-muted-foreground">
          {activeDays} active {activeDays === 1 ? "day" : "days"}
        </p>
      </div>

      {/* Columns are weeks, rows are weekdays — so the grid flows down each
          column before moving right, which is what grid-flow-col does with a
          fixed row count. Overflow-x rather than shrinking the cells: below
          about 8px a day square stops being readable. */}
      <div className="mt-3 overflow-x-auto pb-1">
        <div
          className="grid w-max grid-flow-col grid-rows-7 gap-[3px]"
          role="img"
          aria-label={`Study activity heatmap: ${activeDays} active days out of the last ${past.length}.`}
        >
          {cells.map((cell) => (
            <span
              key={cell.dayKey}
              title={
                cell.isFuture
                  ? undefined
                  : `${formatDay(cell.dayKey)} — ${cell.count === 0 ? "nothing" : `${cell.count} activities`}`
              }
              className={`h-3 w-3 rounded-[3px] ${
                cell.isFuture ? "bg-transparent" : LEVEL_CLASSES[levelOf(cell.count)]
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {formatDay(cells[0].dayKey)} – {formatDay(past[past.length - 1].dayKey)}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Less</span>
          {LEVEL_CLASSES.map((className, level) => (
            <span
              key={level}
              className={`h-3 w-3 rounded-[3px] ${className}`}
              aria-hidden="true"
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
