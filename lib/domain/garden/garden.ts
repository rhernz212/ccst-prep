/**
 * The study garden: one plant for every day you studied.
 *
 * The whole thing is derived, never stored. Every plant is a projection of
 * timestamps the app already writes when you read a section, take a quiz, sit
 * a practice exam or clear a review — which means a garden can't drift out of
 * step with the study record behind it, there's nothing to migrate, and
 * nothing new to write on the hot path of reading a chapter.
 *
 * Days are the unit rather than sessions, for the same reason the streak is:
 * a garden you can farm by opening and closing the same page twenty times
 * isn't measuring anything. Which *plant* a day grows is decided by the most
 * demanding thing you did that day, so a day gets its species from the exam
 * you sat, not from the six sections you skimmed afterwards.
 */

import { addDays, localDayKey } from "../profile/studyActivity";

export type ActivityKind = "read" | "quiz" | "exam" | "review";

export type Species = "fern" | "daisy" | "tulip" | "sunflower" | "rose" | "moonflower";

export interface GardenEvent {
  kind: ActivityKind;
  /** ISO instant. Nulls are filtered out by the caller. */
  at: string;
}

export interface Plant {
  dayKey: string;
  species: Species;
  /** 0 sprout · 1 bud · 2 bloom · 3 full bloom. */
  stage: number;
  /** How many study actions that day — what the stage is derived from. */
  activityCount: number;
  kinds: ActivityKind[];
  /** Planted inside a run of STREAK_HALO_DAYS or more consecutive days. */
  inStreak: boolean;
  /** Stable 0–1 value for placement jitter, so a plant never moves. */
  seed: number;
}

export interface GardenTier {
  index: number;
  name: string;
  blurb: string;
  minDays: number;
}

export interface GardenBed {
  /** YYYY-MM. */
  monthKey: string;
  plants: Plant[];
}

export interface Garden {
  /** Oldest first, so the garden reads left-to-right as time. */
  plants: Plant[];
  beds: GardenBed[];
  totalPlants: number;
  tier: GardenTier;
  nextTier: GardenTier | null;
  /** Days of study still needed to reach `nextTier`; null at the top tier. */
  daysToNextTier: number | null;
  speciesCounts: Record<Species, number>;
  /** How many of the six species have ever been grown. */
  speciesFound: number;
  /** Plants growing inside a long streak — the ones that get a halo. */
  haloCount: number;
}

/** A run this long or longer lights every plant in it. */
export const STREAK_HALO_DAYS = 7;

/** Activities in one day that make it a marathon, and grow a rose. */
export const MARATHON_ACTIVITIES = 10;

/**
 * Hours (local) that count as the small hours. Anything studied in this
 * window grows a moonflower, which is the only species you can't get by
 * studying more — only by studying later.
 */
export const NIGHT_FROM_HOUR = 23;
export const NIGHT_UNTIL_HOUR = 5;

/** Lower bound of activities for each stage, ascending. */
const STAGE_THRESHOLDS = [1, 2, 4, 8];

/**
 * Which species wins when a day earned several, most demanding first. A day
 * with one exam and six sections read is an exam day.
 */
const KIND_SPECIES: [ActivityKind, Species][] = [
  ["exam", "sunflower"],
  ["review", "tulip"],
  ["quiz", "daisy"],
  ["read", "fern"],
];

export const SPECIES_ORDER: Species[] = [
  "fern",
  "daisy",
  "tulip",
  "sunflower",
  "rose",
  "moonflower",
];

export const SPECIES_INFO: Record<Species, { label: string; earnedBy: string }> = {
  fern: { label: "Fern", earnedBy: "a day spent reading the book" },
  daisy: { label: "Daisy", earnedBy: "a day you took a chapter quiz" },
  tulip: { label: "Tulip", earnedBy: "a day you cleared reviews" },
  sunflower: { label: "Sunflower", earnedBy: "a day you sat a practice exam" },
  rose: { label: "Rose", earnedBy: `${MARATHON_ACTIVITIES}+ things in one day` },
  moonflower: { label: "Moonflower", earnedBy: "studying after 11pm or before 5am" },
};

export const GARDEN_TIERS: GardenTier[] = [
  { index: 0, name: "Bare plot", minDays: 0, blurb: "Nothing planted yet. Read a section to sow the first seed." },
  { index: 1, name: "Seedbed", minDays: 1, blurb: "Something's coming up." },
  { index: 2, name: "Flower bed", minDays: 5, blurb: "It's starting to look deliberate." },
  { index: 3, name: "Cottage garden", minDays: 15, blurb: "Overgrown in the good way." },
  { index: 4, name: "Wildflower meadow", minDays: 30, blurb: "You've been at this a while." },
  { index: 5, name: "Botanical garden", minDays: 60, blurb: "People come here on purpose now." },
];

/**
 * The hour of day an instant falls on, in `timeZone`, 0–23.
 *
 * hourCycle h23 rather than trusting the locale: en-US formats midnight as
 * "12 AM", and Number("12") at midnight would put every late-night session in
 * the middle of the afternoon. An unrecognised zone throws inside Intl and
 * falls back to UTC, matching localDayKey.
 */
export function localHour(instant: Date | string, timeZone: string): number {
  const date = typeof instant === "string" ? new Date(instant) : instant;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    return Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  } catch {
    return localHour(date, "UTC");
  }
}

export function isNightHour(hour: number): boolean {
  return hour >= NIGHT_FROM_HOUR || hour < NIGHT_UNTIL_HOUR;
}

export function stageForCount(count: number): number {
  let stage = 0;
  for (let index = 1; index < STAGE_THRESHOLDS.length; index++) {
    if (count >= STAGE_THRESHOLDS[index]) stage = index;
  }
  return stage;
}

export function speciesForDay(
  kinds: Set<ActivityKind>,
  activityCount: number,
  studiedAtNight: boolean
): Species {
  if (studiedAtNight) return "moonflower";
  if (activityCount >= MARATHON_ACTIVITIES) return "rose";

  for (const [kind, species] of KIND_SPECIES) {
    if (kinds.has(kind)) return species;
  }
  // Unreachable while a day only exists because it had at least one event,
  // but a day with no recognised kind should still show up as *something*.
  return "fern";
}

export function tierForDays(days: number): GardenTier {
  let tier = GARDEN_TIERS[0];
  for (const candidate of GARDEN_TIERS) {
    if (days >= candidate.minDays) tier = candidate;
  }
  return tier;
}

/**
 * A stable 0–1 value per day, so a plant's lean and offset are the same on
 * every render. Math.random() would reshuffle the whole garden on each visit,
 * and storing offsets for something this cosmetic isn't worth a table.
 * FNV-1a, for no reason beyond being four lines and well-spread.
 */
export function plantSeed(dayKey: string): number {
  let hash = 2166136261;
  for (let index = 0; index < dayKey.length; index++) {
    hash ^= dayKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

/** Day keys that sit inside a run of `minRun` or more consecutive days. */
function daysInLongRuns(dayKeys: Set<string>, minRun: number): Set<string> {
  const inRun = new Set<string>();

  for (const key of dayKeys) {
    // Walk each run once, from its first day.
    if (dayKeys.has(addDays(key, -1))) continue;

    const run: string[] = [];
    let cursor = key;
    while (dayKeys.has(cursor)) {
      run.push(cursor);
      cursor = addDays(cursor, 1);
    }
    if (run.length >= minRun) for (const day of run) inRun.add(day);
  }

  return inRun;
}

/** Calendar months, oldest first. Months with no study at all are skipped. */
export function groupIntoBeds(plants: Plant[]): GardenBed[] {
  const beds: GardenBed[] = [];

  for (const plant of plants) {
    const monthKey = plant.dayKey.slice(0, 7);
    const last = beds[beds.length - 1];
    if (last && last.monthKey === monthKey) last.plants.push(plant);
    else beds.push({ monthKey, plants: [plant] });
  }

  return beds;
}

export function buildGarden(events: GardenEvent[], timeZone: string): Garden {
  const kindsByDay = new Map<string, Set<ActivityKind>>();
  const countByDay = new Map<string, number>();
  const nightDays = new Set<string>();

  for (const event of events) {
    if (!event.at) continue;
    const dayKey = localDayKey(event.at, timeZone);

    const kinds = kindsByDay.get(dayKey) ?? new Set<ActivityKind>();
    kinds.add(event.kind);
    kindsByDay.set(dayKey, kinds);
    countByDay.set(dayKey, (countByDay.get(dayKey) ?? 0) + 1);

    if (isNightHour(localHour(event.at, timeZone))) nightDays.add(dayKey);
  }

  const dayKeys = new Set(countByDay.keys());
  const haloDays = daysInLongRuns(dayKeys, STREAK_HALO_DAYS);

  const plants: Plant[] = [...dayKeys]
    .sort()
    .map((dayKey) => {
      const kinds = kindsByDay.get(dayKey) ?? new Set<ActivityKind>();
      const activityCount = countByDay.get(dayKey) ?? 0;

      return {
        dayKey,
        species: speciesForDay(kinds, activityCount, nightDays.has(dayKey)),
        stage: stageForCount(activityCount),
        activityCount,
        // Sorted so the tooltip lists them the same way every time.
        kinds: [...kinds].sort(),
        inStreak: haloDays.has(dayKey),
        seed: plantSeed(dayKey),
      };
    });

  const speciesCounts = Object.fromEntries(
    SPECIES_ORDER.map((species) => [species, 0])
  ) as Record<Species, number>;
  for (const plant of plants) speciesCounts[plant.species]++;

  const tier = tierForDays(plants.length);
  const nextTier = GARDEN_TIERS[tier.index + 1] ?? null;

  return {
    plants,
    beds: groupIntoBeds(plants),
    totalPlants: plants.length,
    tier,
    nextTier,
    daysToNextTier: nextTier ? nextTier.minDays - plants.length : null,
    speciesCounts,
    speciesFound: SPECIES_ORDER.filter((species) => speciesCounts[species] > 0).length,
    haloCount: plants.filter((plant) => plant.inStreak).length,
  };
}
