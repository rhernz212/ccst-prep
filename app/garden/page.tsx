import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { ArrowLeft, Flame, Flower2, Sparkles, Sprout } from "lucide-react";
import { isOwner } from "@/lib/owner";
import { getGardenData } from "@/lib/garden/get-garden";
import { STREAK_HALO_DAYS } from "@/lib/domain/garden/garden";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { GardenScene } from "@/components/garden/GardenScene";
import { SpeciesCollection } from "@/components/garden/SpeciesCollection";

export const metadata: Metadata = { title: "Your garden · Cert Prep" };

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Sprout;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <div className="tabular mt-1.5 font-display text-fluid-2xl font-bold text-foreground">
        {value}
      </div>
      <p className="tabular mt-1 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}

/**
 * The study garden — one plant for every day of study, grown from data the
 * app already had.
 *
 * notFound() rather than a redirect for anyone else, so the route is simply
 * absent for them: this is a personal toy, not a feature with an upsell.
 */
export default async function GardenPage() {
  if (!(await isOwner())) notFound();

  const data = await getGardenData();
  if (!data) notFound();

  const { garden } = data;
  const tierProgress = garden.nextTier
    ? Math.min(100, Math.round((garden.totalPlants / garden.nextTier.minDays) * 100))
    : 100;

  return (
    <main className="animate-fade-in-up mx-auto w-full max-w-4xl grow px-4 py-8 sm:py-10">
      {/* A green aura rather than the app's usual brand/signal pair — this is
          the one page that isn't about the exam. */}
      <header
        className="aura relative"
        style={
          {
            "--aura": "var(--color-success-500)",
            "--aura-2": "var(--color-accent-400)",
          } as CSSProperties
        }
      >
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-600 dark:hover:text-brand-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to your profile
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-fluid-2xl font-bold text-foreground">Your garden</h1>
          <Badge variant="success">{garden.tier.name}</Badge>
        </div>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          {garden.tier.blurb} Every day you study plants something — what it grows into depends on
          what you did, and how much of it.
        </p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={Sprout}
          label="Planted"
          value={String(garden.totalPlants)}
          hint={garden.totalPlants === 1 ? "day of study" : "days of study"}
        />
        <Metric
          icon={Flower2}
          label="Species"
          value={`${garden.speciesFound} of 6`}
          hint="grown at least once"
        />
        <Metric
          icon={Flame}
          label="Streak"
          value={`${data.currentStreak} ${data.currentStreak === 1 ? "day" : "days"}`}
          hint={`longest ${data.longestStreak} · best run so far`}
        />
        <Metric
          icon={Sparkles}
          label="Lit up"
          value={String(garden.haloCount)}
          hint={`plants inside a ${STREAK_HALO_DAYS}-day run`}
        />
      </section>

      {garden.nextTier && (
        <section className="mt-4">
          <Card className="p-5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm font-medium text-foreground">
                Next: {garden.nextTier.name}
              </span>
              <span className="tabular text-xs text-muted-foreground">
                {garden.daysToNextTier} more {garden.daysToNextTier === 1 ? "day" : "days"} of study
              </span>
            </div>
            <ProgressBar
              value={tierProgress}
              size="sm"
              colorClassName="bg-linear-to-r from-success-500 to-success-400"
            />
          </Card>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-fluid-xl font-semibold text-foreground">The beds</h2>
          <p className="text-sm text-muted-foreground">
            {data.plantedToday ? "Today's already planted." : "Nothing planted today yet."}
          </p>
        </div>

        {garden.beds.length > 0 ? (
          <GardenScene beds={garden.beds} />
        ) : (
          <Card className="p-8 text-center">
            <Sprout className="mx-auto h-8 w-8 text-success-500" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">
              Bare soil. Read a section, take a quiz, or clear a review and the first thing comes
              up today.
            </p>
            <div className="mt-4 flex justify-center">
              <Button href="/" size="sm">
                Start studying
              </Button>
            </div>
          </Card>
        )}
      </section>

      <section className="mt-10">
        <SpeciesCollection counts={garden.speciesCounts} found={garden.speciesFound} />
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Stages grow with how much you did that day — 1 thing sprouts, 2 buds, 4 blooms, 8 opens all
        the way. Plants inside a run of {STREAK_HALO_DAYS} days or more are lit. Days are counted
        against your local calendar ({data.timeZone}), and the whole garden is derived from your
        study record, so nothing here can be watered without studying.
      </p>
    </main>
  );
}
