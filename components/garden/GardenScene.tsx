import { SPECIES_INFO, type GardenBed } from "@/lib/domain/garden/garden";
import { Plant, SOIL, SOIL_HEIGHT, SOIL_TOP } from "./Plant";

function formatMonth(monthKey: string): string {
  // Parsed and formatted in UTC — the key is a local calendar month, and
  // letting the runtime reinterpret it can shift it to the month before.
  return new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

function formatDay(dayKey: string): string {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * The garden itself: one bed per calendar month, one plant per day studied.
 *
 * Beds run oldest-first so the garden reads as a timeline — the far end is
 * where you started, and today is always the last thing planted.
 */
export function GardenScene({ beds }: { beds: GardenBed[] }) {
  return (
    <div className="space-y-5">
      {beds.map((bed) => (
        <section key={bed.monthKey}>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-sm font-semibold text-foreground">
              {formatMonth(bed.monthKey)}
            </h3>
            <span className="tabular text-xs text-muted-foreground">
              {bed.plants.length} {bed.plants.length === 1 ? "day" : "days"}
            </span>
          </div>

          {/* Sky, with the ground running the full width behind the plants.
              Each plant draws its own matching strip, so a full bed tiles
              into one continuous bank of soil and a near-empty one still has
              somewhere for the next plant to go.

              One scrolling row rather than a wrapping grid: wrapped rows
              would each need their own ground line, and a 31-day month is
              exactly the shape the heatmap above already scrolls. */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-linear-to-b from-[oklch(93%_0.035_235)] to-[oklch(96%_0.03_140)] dark:from-[oklch(27%_0.05_268)] dark:to-[oklch(21%_0.035_268)]">
            <div className="relative flex w-max min-w-full items-end px-1 pt-5">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0"
                style={{
                  height: SOIL_HEIGHT,
                  background: `linear-gradient(to bottom, ${SOIL_TOP} 0 1.6px, ${SOIL} 1.6px)`,
                }}
              />
              {bed.plants.map((plant) => (
                <span
                  key={plant.dayKey}
                  title={`${formatDay(plant.dayKey)} · ${SPECIES_INFO[plant.species].label} · ${
                    plant.activityCount
                  } ${plant.activityCount === 1 ? "thing" : "things"} studied${
                    plant.inStreak ? " · on a streak" : ""
                  }`}
                  className="relative block"
                >
                  <Plant
                    species={plant.species}
                    stage={plant.stage}
                    inStreak={plant.inStreak}
                    seed={plant.seed}
                  />
                </span>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
