import { describe, expect, it } from "vitest";
import {
  buildGarden,
  groupIntoBeds,
  isNightHour,
  localHour,
  MARATHON_ACTIVITIES,
  plantSeed,
  speciesForDay,
  stageForCount,
  STREAK_HALO_DAYS,
  tierForDays,
  type ActivityKind,
  type GardenEvent,
} from "@/lib/domain/garden/garden";

/** `count` events of one kind on one day, spread across the working day. */
function day(dayKey: string, kind: ActivityKind, count = 1): GardenEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    kind,
    at: `${dayKey}T${String(9 + (index % 8)).padStart(2, "0")}:00:00.000Z`,
  }));
}

describe("localHour", () => {
  it("reads the hour in the given zone", () => {
    expect(localHour("2026-08-05T03:30:00.000Z", "UTC")).toBe(3);
    expect(localHour("2026-08-05T03:30:00.000Z", "America/Chicago")).toBe(22);
  });

  it("returns 0 rather than 12 at midnight", () => {
    // en-US would format this as "12 AM"; the h23 hour cycle is what stops a
    // midnight session being read as noon.
    expect(localHour("2026-08-05T00:15:00.000Z", "UTC")).toBe(0);
  });

  it("falls back to UTC for an unrecognised zone", () => {
    expect(localHour("2026-08-05T03:30:00.000Z", "Not/AZone")).toBe(3);
  });
});

describe("isNightHour", () => {
  it("covers the window either side of midnight", () => {
    expect(isNightHour(23)).toBe(true);
    expect(isNightHour(0)).toBe(true);
    expect(isNightHour(4)).toBe(true);
  });

  it("excludes daytime and the evening", () => {
    expect(isNightHour(5)).toBe(false);
    expect(isNightHour(13)).toBe(false);
    expect(isNightHour(22)).toBe(false);
  });
});

describe("stageForCount", () => {
  it("grows through four stages", () => {
    expect(stageForCount(1)).toBe(0);
    expect(stageForCount(2)).toBe(1);
    expect(stageForCount(3)).toBe(1);
    expect(stageForCount(4)).toBe(2);
    expect(stageForCount(7)).toBe(2);
    expect(stageForCount(8)).toBe(3);
    expect(stageForCount(40)).toBe(3);
  });
});

describe("speciesForDay", () => {
  it("picks the most demanding activity of the day", () => {
    expect(speciesForDay(new Set<ActivityKind>(["read"]), 3, false)).toBe("fern");
    expect(speciesForDay(new Set<ActivityKind>(["read", "quiz"]), 3, false)).toBe("daisy");
    expect(speciesForDay(new Set<ActivityKind>(["read", "review"]), 3, false)).toBe("tulip");
    expect(speciesForDay(new Set<ActivityKind>(["read", "quiz", "exam"]), 3, false)).toBe(
      "sunflower"
    );
  });

  it("grows a rose on a marathon day", () => {
    expect(speciesForDay(new Set<ActivityKind>(["read"]), MARATHON_ACTIVITIES, false)).toBe("rose");
  });

  it("lets the moonflower outrank everything, including a marathon", () => {
    expect(speciesForDay(new Set<ActivityKind>(["exam"]), MARATHON_ACTIVITIES, true)).toBe(
      "moonflower"
    );
  });
});

describe("tierForDays", () => {
  it("moves up as the days add up", () => {
    expect(tierForDays(0).name).toBe("Bare plot");
    expect(tierForDays(1).name).toBe("Seedbed");
    expect(tierForDays(14).name).toBe("Flower bed");
    expect(tierForDays(15).name).toBe("Cottage garden");
    expect(tierForDays(1000).name).toBe("Botanical garden");
  });
});

describe("plantSeed", () => {
  it("is stable for a day and spread across days", () => {
    expect(plantSeed("2026-08-04")).toBe(plantSeed("2026-08-04"));
    expect(plantSeed("2026-08-04")).not.toBe(plantSeed("2026-08-05"));

    const seeds = Array.from({ length: 60 }, (_, index) =>
      plantSeed(`2026-08-${String(index + 1).padStart(2, "0")}`)
    );
    expect(seeds.every((seed) => seed >= 0 && seed <= 1)).toBe(true);
    expect(new Set(seeds).size).toBe(seeds.length);
  });
});

describe("groupIntoBeds", () => {
  it("splits plants into calendar months, oldest first", () => {
    const garden = buildGarden(
      [...day("2026-07-30", "read"), ...day("2026-08-01", "quiz"), ...day("2026-08-02", "read")],
      "UTC"
    );

    expect(groupIntoBeds(garden.plants).map((bed) => bed.monthKey)).toEqual(["2026-07", "2026-08"]);
    expect(groupIntoBeds(garden.plants)[1].plants).toHaveLength(2);
  });
});

describe("buildGarden", () => {
  it("plants one plant per day studied, oldest first", () => {
    const garden = buildGarden(
      [...day("2026-08-04", "read", 3), ...day("2026-08-02", "quiz")],
      "UTC"
    );

    expect(garden.plants.map((plant) => plant.dayKey)).toEqual(["2026-08-02", "2026-08-04"]);
    expect(garden.totalPlants).toBe(2);
  });

  it("counts every activity on a day toward one plant's stage", () => {
    const garden = buildGarden(day("2026-08-04", "read", 5), "UTC");

    expect(garden.plants).toHaveLength(1);
    expect(garden.plants[0].activityCount).toBe(5);
    expect(garden.plants[0].stage).toBe(2);
  });

  it("buckets days in the user's zone, not UTC", () => {
    // 03:30 UTC on the 5th is 22:30 on the 4th in Chicago — one day either
    // way, but a different one.
    const events: GardenEvent[] = [{ kind: "read", at: "2026-08-05T03:30:00.000Z" }];

    expect(buildGarden(events, "UTC").plants[0].dayKey).toBe("2026-08-05");
    expect(buildGarden(events, "America/Chicago").plants[0].dayKey).toBe("2026-08-04");
  });

  it("grows a moonflower from a session in the small hours", () => {
    const garden = buildGarden(
      [
        { kind: "read", at: "2026-08-04T15:00:00.000Z" },
        { kind: "read", at: "2026-08-04T01:20:00.000Z" },
      ],
      "UTC"
    );

    expect(garden.plants[0].species).toBe("moonflower");
  });

  it("only haloes plants inside a long enough run", () => {
    const shortRun = Array.from({ length: STREAK_HALO_DAYS - 1 }, (_, index) =>
      day(`2026-08-${String(index + 1).padStart(2, "0")}`, "read")
    ).flat();
    expect(buildGarden(shortRun, "UTC").haloCount).toBe(0);

    const longRun = Array.from({ length: STREAK_HALO_DAYS }, (_, index) =>
      day(`2026-08-${String(index + 1).padStart(2, "0")}`, "read")
    ).flat();
    const garden = buildGarden(longRun, "UTC");
    expect(garden.haloCount).toBe(STREAK_HALO_DAYS);
    expect(garden.plants.every((plant) => plant.inStreak)).toBe(true);
  });

  it("leaves a day outside the run unlit", () => {
    const events = [
      ...Array.from({ length: STREAK_HALO_DAYS }, (_, index) =>
        day(`2026-08-${String(index + 1).padStart(2, "0")}`, "read")
      ).flat(),
      // A gap, then a lone day.
      ...day("2026-08-20", "read"),
    ];

    const garden = buildGarden(events, "UTC");
    expect(garden.haloCount).toBe(STREAK_HALO_DAYS);
    expect(garden.plants[garden.plants.length - 1].inStreak).toBe(false);
  });

  it("tallies species and reports how many have been found", () => {
    const garden = buildGarden(
      [
        ...day("2026-08-01", "read"),
        ...day("2026-08-03", "quiz"),
        ...day("2026-08-05", "exam"),
        ...day("2026-08-07", "read"),
      ],
      "UTC"
    );

    expect(garden.speciesCounts.fern).toBe(2);
    expect(garden.speciesCounts.daisy).toBe(1);
    expect(garden.speciesCounts.sunflower).toBe(1);
    expect(garden.speciesCounts.moonflower).toBe(0);
    expect(garden.speciesFound).toBe(3);
  });

  it("reports the tier and how far the next one is", () => {
    const garden = buildGarden(day("2026-08-01", "read"), "UTC");

    expect(garden.tier.name).toBe("Seedbed");
    expect(garden.nextTier?.name).toBe("Flower bed");
    expect(garden.daysToNextTier).toBe(4);
  });

  it("is an empty plot with no study at all", () => {
    const garden = buildGarden([], "UTC");

    expect(garden.plants).toEqual([]);
    expect(garden.beds).toEqual([]);
    expect(garden.tier.name).toBe("Bare plot");
    expect(garden.speciesFound).toBe(0);
  });

  it("ignores events with no timestamp", () => {
    const garden = buildGarden([{ kind: "review", at: "" }, ...day("2026-08-01", "read")], "UTC");

    expect(garden.totalPlants).toBe(1);
  });
});
