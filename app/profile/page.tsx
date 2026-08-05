import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarClock,
  Clock,
  Flame,
  Flower2,
  LogOut,
  NotebookPen,
  RefreshCw,
} from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { getProfileData } from "@/lib/profile/get-profile-data";
import { isOwner } from "@/lib/owner";
import { Card } from "@/components/ui/Card";
import { CertCard } from "@/components/profile/CertCard";
import { DisplayNameForm } from "@/components/profile/DisplayNameForm";
import { StudyHeatmap } from "@/components/profile/StudyHeatmap";
import { TimeZoneSync } from "@/components/profile/TimeZoneSync";

export const metadata: Metadata = { title: "Your profile · Cert Prep" };

function formatDate(dayKey: string): string {
  // The key is already a local calendar date; parsing and formatting both in
  // UTC stops the runtime's own zone from shifting it by a day.
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint?: string;
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
      {hint && <p className="tabular mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export default async function ProfilePage() {
  // getCurrentUser is cache()d for the render pass, so the owner check rides
  // along on the call getProfileData already makes.
  const [profile, owner] = await Promise.all([getProfileData(), isOwner()]);
  if (!profile) redirect(`/sign-in?redirect=${encodeURIComponent("/profile")}`);

  const { activity, certs } = profile;
  const initial = (profile.displayName ?? profile.email)[0]?.toUpperCase() ?? "?";

  // The countdown headline follows the soonest exam still ahead of the user.
  // Dates that have already passed drop out rather than counting up, which
  // would read as a reproach every time the page loaded.
  const nextExam = certs
    .filter((cert) => cert.daysUntilExam !== null && cert.daysUntilExam >= 0)
    .sort((a, b) => (a.daysUntilExam ?? 0) - (b.daysUntilExam ?? 0))[0];

  const countdown =
    nextExam === undefined
      ? "Not set"
      : nextExam.daysUntilExam === 0
        ? "Today"
        : `${nextExam.daysUntilExam} ${nextExam.daysUntilExam === 1 ? "day" : "days"}`;

  return (
    <main className="animate-fade-in-up mx-auto w-full max-w-4xl grow px-4 py-8 sm:py-10">
      <TimeZoneSync storedTimeZone={profile.storedTimeZone} />

      <header className="aura relative">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand-400 to-brand-600 font-display text-xl font-bold text-white shadow-raised"
            aria-hidden="true"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <h1 className="text-fluid-2xl font-bold text-foreground">
              {profile.displayName ?? "Your profile"}
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {profile.email} · joined {formatDate(profile.joinedAt.slice(0, 10))}
            </p>
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={CalendarClock}
          label="Next exam"
          value={countdown}
          hint={
            nextExam?.examDate
              ? `${nextExam.examCode} · ${formatDate(nextExam.examDate)}`
              : "Set a date below to start the countdown"
          }
        />
        <Metric
          icon={Flame}
          label="Study streak"
          value={`${activity.currentStreak} ${activity.currentStreak === 1 ? "day" : "days"}`}
          hint={`${activity.totalDays} days studied · longest ${activity.longestStreak}`}
        />
        <Metric
          icon={RefreshCw}
          label="Due for review"
          value={String(profile.totalReviewDue)}
          hint={profile.totalReviewDue === 0 ? "You're caught up" : "questions scheduled for today"}
        />
        <Metric
          icon={NotebookPen}
          label="Your notes"
          value={String(profile.totalNotes)}
          hint="across every chapter"
        />
      </section>

      <section className="mt-4">
        <Card className="p-5">
          <StudyHeatmap cells={activity.heatmap} />
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            A day counts once you read a section, take a quiz, sit a practice exam, or clear a
            review — counted against your local calendar ({profile.timeZone}).
          </p>
        </Card>
      </section>

      {/* The garden is the same study record as the heatmap above it, drawn
          for fun rather than for information — so it sits directly under it
          and links out rather than taking space on this page. */}
      {owner && (
        <section className="mt-4">
          <Card interactive href="/garden" className="flex items-center gap-4 p-5">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-success-400 to-success-600 text-white shadow-raised"
              aria-hidden="true"
            >
              <Flower2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="font-display text-lg font-semibold text-foreground">Your garden</div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                A plant for every day you&apos;ve studied — sunflowers for practice exams,
                moonflowers for the late nights.
              </p>
            </div>
            <ArrowRight
              className="ml-auto hidden h-4 w-4 shrink-0 text-muted-foreground sm:block"
              aria-hidden="true"
            />
          </Card>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-fluid-xl font-semibold text-foreground">Your certifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Where you stand on each one, and when you&apos;re sitting it.
        </p>

        <div className="mt-5 space-y-4">
          {certs.map((cert) => (
            <CertCard key={cert.slug} cert={cert} />
          ))}
          {certs.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              No certifications available yet.
            </Card>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-fluid-xl font-semibold text-foreground">Account</h2>

        <Card className="mt-4 divide-y divide-border">
          <Row label="Display name" hint="Shown here instead of your email.">
            <DisplayNameForm displayName={profile.displayName} />
          </Row>

          <Row label="Email" hint="Used to sign in.">
            <span className="text-sm text-muted-foreground">{profile.email}</span>
          </Row>

          <Row
            label="Time zone"
            hint="Detected from this browser; your streak is counted against it."
          >
            <span className="text-sm text-muted-foreground">{profile.timeZone}</span>
          </Row>

          {/* No theme row: the toggle already lives in the global header, and
              two controls for one setting in the same viewport is worse than
              none. */}
          <Row label="Sign out" hint={`Signed in as ${profile.email}.`}>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-spring)] hover:bg-surface-hover active:scale-[0.97]"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Sign out
              </button>
            </form>
          </Row>
        </Card>

        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Clock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Changing your password or deleting your account isn&apos;t wired up yet — both need a
            re-authentication step before they&apos;d be safe to expose here.
          </span>
        </p>
      </section>
    </main>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 p-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}
