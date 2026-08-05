import { SPECIES_INFO, SPECIES_ORDER, type Species } from "@/lib/domain/garden/garden";
import { Plant } from "./Plant";

/**
 * The six species, and how each one is earned.
 *
 * Species you haven't grown yet are shown greyed rather than hidden: the list
 * is the only place the rules are written down, and half of them ("study
 * after 11pm", "ten things in one day") aren't guessable from a garden that
 * hasn't grown one yet.
 */
export function SpeciesCollection({
  counts,
  found,
}: {
  counts: Record<Species, number>;
  found: number;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-fluid-xl font-semibold text-foreground">Species</h2>
        <p className="tabular text-sm text-muted-foreground">
          {found} of {SPECIES_ORDER.length} grown
        </p>
      </div>

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {SPECIES_ORDER.map((species) => {
          const count = counts[species];
          const info = SPECIES_INFO[species];

          return (
            <li
              key={species}
              className={`flex items-center gap-2 rounded-xl border border-border bg-surface p-2.5 ${
                count === 0 ? "opacity-55" : ""
              }`}
            >
              <span
                className={`grid shrink-0 place-items-end overflow-hidden rounded-lg bg-surface-sunken ${
                  count === 0 ? "grayscale" : ""
                }`}
              >
                {/* Full bloom in the legend whatever your own is at — this is
                    the species, not a plant you grew. */}
                <Plant species={species} stage={3} seed={0.5} />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-semibold text-foreground">{info.label}</span>
                  <span className="tabular text-xs text-muted-foreground">×{count}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{info.earnedBy}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
