import { describe, expect, it } from "vitest";
import {
  addDays,
  buildHeatmap,
  countByDay,
  currentStreak,
  daysBetween,
  HEATMAP_WEEKS,
  localDayKey,
  longestStreak,
  summarizeActivity,
} from "@/lib/domain/profile/studyActivity";

describe("localDayKey", () => {
  it("buckets an instant into the calendar day of the given zone", () => {
    // 03:30 UTC on the 5th is still 22:30 on the 4th in Chicago.
    const instant = "2026-08-05T03:30:00.000Z";
    expect(localDayKey(instant, "UTC")).toBe("2026-08-05");
    expect(localDayKey(instant, "America/Chicago")).toBe("2026-08-04");
  });

  it("handles zones ahead of UTC", () => {
    expect(localDayKey("2026-08-04T22:00:00.000Z", "Asia/Tokyo")).toBe("2026-08-05");
  });

  it("falls back to UTC for an unrecognised zone", () => {
    expect(localDayKey("2026-08-05T03:30:00.000Z", "Not/AZone")).toBe("2026-08-05");
  });
});

describe("addDays / daysBetween", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("crosses a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("counts whole days in both directions", () => {
    expect(daysBetween("2026-08-04", "2026-09-14")).toBe(41);
    expect(daysBetween("2026-09-14", "2026-08-04")).toBe(-41);
    expect(daysBetween("2026-08-04", "2026-08-04")).toBe(0);
  });

  it("is unaffected by a DST transition in the middle", () => {
    // US DST ends 1 Nov 2026; a naive local-time diff would give 41.04 days.
    expect(daysBetween("2026-10-25", "2026-11-08")).toBe(14);
  });
});

describe("countByDay", () => {
  it("collapses several sessions on one day into one day", () => {
    const counts = countByDay(
      ["2026-08-04T09:00:00Z", "2026-08-04T18:00:00Z", "2026-08-05T09:00:00Z"],
      "UTC"
    );

    expect(counts.get("2026-08-04")).toBe(2);
    expect(counts.size).toBe(2);
  });

  it("ignores nulls, which is what an unsubmitted attempt's timestamp is", () => {
    expect(countByDay([null, undefined, "2026-08-04T09:00:00Z"], "UTC").size).toBe(1);
  });
});

describe("currentStreak", () => {
  const days = (...keys: string[]) => new Set(keys);

  it("counts back from today", () => {
    expect(
      currentStreak(days("2026-08-02", "2026-08-03", "2026-08-04"), "2026-08-04")
    ).toBe(3);
  });

  it("survives a today with no activity yet", () => {
    // Opening the app at 7am shouldn't report the streak as already broken.
    expect(currentStreak(days("2026-08-02", "2026-08-03"), "2026-08-04")).toBe(2);
  });

  it("breaks once a full day has been missed", () => {
    expect(currentStreak(days("2026-08-01", "2026-08-02"), "2026-08-04")).toBe(0);
  });

  it("stops at the gap rather than counting every day present", () => {
    expect(
      currentStreak(days("2026-07-20", "2026-08-03", "2026-08-04"), "2026-08-04")
    ).toBe(2);
  });

  it("is zero with no activity at all", () => {
    expect(currentStreak(days(), "2026-08-04")).toBe(0);
  });
});

describe("longestStreak", () => {
  it("finds the longest run anywhere in the history", () => {
    const keys = new Set([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-08-03",
      "2026-08-04",
    ]);

    expect(longestStreak(keys)).toBe(4);
  });

  it("counts a lone day as a streak of one", () => {
    expect(longestStreak(new Set(["2026-08-04"]))).toBe(1);
  });

  it("is zero with no activity", () => {
    expect(longestStreak(new Set())).toBe(0);
  });
});

describe("buildHeatmap", () => {
  it("emits whole weeks ending with the week containing today", () => {
    // 2026-08-04 is a Tuesday, so its week runs Sun 2026-08-02 .. Sat 2026-08-08.
    const cells = buildHeatmap(new Map(), "2026-08-04", 12);

    expect(cells).toHaveLength(84);
    expect(cells[0].dayKey).toBe("2026-05-17");
    expect(cells[83].dayKey).toBe("2026-08-08");
  });

  it("defaults to the six-month window the profile page renders", () => {
    expect(buildHeatmap(new Map(), "2026-08-04")).toHaveLength(HEATMAP_WEEKS * 7);
  });

  it("starts every column on a Sunday", () => {
    const cells = buildHeatmap(new Map(), "2026-08-04", 4);
    for (let i = 0; i < cells.length; i += 7) {
      expect(new Date(`${cells[i].dayKey}T00:00:00Z`).getUTCDay()).toBe(0);
    }
  });

  it("marks the rest of this week as future rather than as empty study days", () => {
    const cells = buildHeatmap(new Map(), "2026-08-04", 4);
    const today = cells.find((c) => c.dayKey === "2026-08-04");
    const tomorrow = cells.find((c) => c.dayKey === "2026-08-05");

    expect(today?.isFuture).toBe(false);
    expect(tomorrow?.isFuture).toBe(true);
  });

  it("carries the per-day counts through", () => {
    const cells = buildHeatmap(new Map([["2026-08-03", 5]]), "2026-08-04", 4);
    expect(cells.find((c) => c.dayKey === "2026-08-03")?.count).toBe(5);
  });
});

describe("summarizeActivity", () => {
  it("reports streaks in the user's zone, not UTC", () => {
    // Three consecutive late-evening Chicago sessions. Read as UTC they land
    // on the 3rd, 4th and 5th; read locally they're the 2nd, 3rd and 4th —
    // and only the local reading makes this a streak ending today.
    const timestamps = [
      "2026-08-03T02:00:00Z",
      "2026-08-04T02:00:00Z",
      "2026-08-05T02:00:00Z",
    ];

    const activity = summarizeActivity(timestamps, "America/Chicago", "2026-08-04");

    expect(activity.currentStreak).toBe(3);
    expect(activity.totalDays).toBe(3);
  });

  it("has an empty summary for a user who has never studied", () => {
    const activity = summarizeActivity([], "UTC", "2026-08-04");

    expect(activity).toMatchObject({ currentStreak: 0, longestStreak: 0, totalDays: 0 });
    expect(activity.heatmap).toHaveLength(HEATMAP_WEEKS * 7);
  });
});
