/**
 * Turning study timestamps into calendar days, streaks and a heatmap grid.
 *
 * Everything here works in "day keys" — YYYY-MM-DD strings in the user's own
 * time zone. That's the whole reason this module exists separately from the
 * query that feeds it: a streak is a claim about someone's local calendar,
 * and the moment you do the arithmetic on UTC instants instead, a 10pm
 * session in Chicago lands on tomorrow and silently breaks a run.
 */

const DAY_MS = 86_400_000;
/**
 * Roughly six months. Long enough to cover the run-up to an exam booked a
 * season out, and wide enough that the grid reads as a chart rather than as a
 * postage stamp in the corner of its card.
 */
export const HEATMAP_WEEKS = 26;

export interface StudyActivity {
  /** Consecutive days ending today, or yesterday if today is still empty. */
  currentStreak: number;
  longestStreak: number;
  /** Distinct days with any study activity, ever. */
  totalDays: number;
  /** Newest-last cells for a 7-row heatmap, Sunday at the top of each column. */
  heatmap: HeatmapCell[];
}

export interface HeatmapCell {
  dayKey: string;
  count: number;
  /** Cells padding out the last week — rendered as empty holes, not zeroes. */
  isFuture: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * The calendar day an instant falls on, in `timeZone`.
 *
 * formatToParts rather than a locale whose format happens to be ISO-ish
 * (en-CA): the parts are named, so this can't quietly start returning
 * "04/08/2026" if the runtime's ICU data shifts underneath it. An
 * unrecognised zone throws inside Intl, and UTC is the honest fallback —
 * better a streak computed in the wrong zone than a profile page that 500s.
 */
export function localDayKey(instant: Date | string, timeZone: string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
  } catch {
    return localDayKey(date, "UTC");
  }

  const find = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${find("year")}-${find("month")}-${find("day")}`;
}

/** Day keys are pure calendar dates, so the arithmetic runs in UTC and never
 *  meets a DST transition. */
function keyToUtcMs(dayKey: string): number {
  const [year, month, day] = dayKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function msToKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(dayKey: string, delta: number): string {
  return msToKey(keyToUtcMs(dayKey) + delta * DAY_MS);
}

/** Whole days from `from` to `to`; negative once `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  return Math.round((keyToUtcMs(to) - keyToUtcMs(from)) / DAY_MS);
}

/** 0 = Sunday, matching the heatmap's row order. */
function weekdayOf(dayKey: string): number {
  return new Date(keyToUtcMs(dayKey)).getUTCDay();
}

/** Counts activity per local day. Several sessions on one day are one day. */
export function countByDay(
  timestamps: (string | null | undefined)[],
  timeZone: string
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const timestamp of timestamps) {
    if (!timestamp) continue;
    const key = localDayKey(timestamp, timeZone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * The run of days ending at `todayKey`.
 *
 * A day that hasn't happened yet can't break a streak, so an empty today
 * falls back to counting from yesterday. Without that, every streak in the
 * app reads as broken from midnight until the user next opens a chapter.
 */
export function currentStreak(dayKeys: Set<string>, todayKey: string): number {
  let cursor = dayKeys.has(todayKey) ? todayKey : addDays(todayKey, -1);
  if (!dayKeys.has(cursor)) return 0;

  let streak = 0;
  while (dayKeys.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(dayKeys: Set<string>): number {
  let longest = 0;
  for (const key of dayKeys) {
    // Only count from the start of a run, so each run is walked once rather
    // than once per day it contains.
    if (dayKeys.has(addDays(key, -1))) continue;

    let length = 0;
    let cursor = key;
    while (dayKeys.has(cursor)) {
      length++;
      cursor = addDays(cursor, 1);
    }
    longest = Math.max(longest, length);
  }
  return longest;
}

/**
 * A `weeks`-wide grid ending on the week containing `todayKey`.
 *
 * The grid is emitted whole weeks at a time — Sunday through Saturday — so
 * the columns line up as weeks rather than as an arbitrary 84-day window
 * starting mid-week.
 */
export function buildHeatmap(
  counts: Map<string, number>,
  todayKey: string,
  weeks = HEATMAP_WEEKS
): HeatmapCell[] {
  const endOfWeek = addDays(todayKey, 6 - weekdayOf(todayKey));
  const start = addDays(endOfWeek, -(weeks * 7 - 1));

  const cells: HeatmapCell[] = [];
  for (let offset = 0; offset < weeks * 7; offset++) {
    const dayKey = addDays(start, offset);
    cells.push({
      dayKey,
      count: counts.get(dayKey) ?? 0,
      isFuture: daysBetween(todayKey, dayKey) > 0,
    });
  }
  return cells;
}

export function summarizeActivity(
  timestamps: (string | null | undefined)[],
  timeZone: string,
  todayKey: string
): StudyActivity {
  const counts = countByDay(timestamps, timeZone);
  const dayKeys = new Set(counts.keys());

  return {
    currentStreak: currentStreak(dayKeys, todayKey),
    longestStreak: longestStreak(dayKeys),
    totalDays: dayKeys.size,
    heatmap: buildHeatmap(counts, todayKey),
  };
}
