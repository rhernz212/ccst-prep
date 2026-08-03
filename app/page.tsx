import { ArrowRight, BookOpen, Calculator, GraduationCap, TerminalSquare } from "lucide-react";
import { listExams } from "@/lib/content/exam-content";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/ui/Logo";

const FEATURES = [
  { icon: BookOpen, label: "Full book content", hint: "Every chapter, searchable and tracked" },
  { icon: GraduationCap, label: "Timed practice exams", hint: "Scored by blueprint domain" },
  { icon: Calculator, label: "Subnetting drills", hint: "Generated to any difficulty" },
  { icon: TerminalSquare, label: "CLI simulator", hint: "ping, tracert, nslookup, netstat" },
];

export default function Home() {
  const exams = listExams();

  return (
    <main className="mx-auto w-full max-w-4xl grow px-4 pt-10 pb-20 sm:pt-16">
      {/* Hero. The aura is the one place on the site with real colour bleed —
          everything below it is restrained by comparison, which is what stops
          the page from feeling uniformly loud. */}
      <section className="aura animate-fade-in-up relative text-center">
        <div className="mb-6 flex justify-center">
          <Logo className="h-16 w-16 rounded-2xl" />
        </div>
        <h1 className="text-fluid-4xl font-bold tracking-tight text-foreground">
          Pass it the <span className="text-gradient">first time</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-fluid-lg text-muted-foreground">
          Read the book, drill the questions, and sit a full timed practice exam — all in one
          place, with your progress carried across every session.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-fluid-xl font-semibold text-foreground">Your certifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick one to jump back in.</p>

        <ul className="mt-5 space-y-3">
          {exams.map((exam) => (
            <li key={exam.slug} className="reveal">
              <Card
                href={`/exams/${exam.slug}`}
                interactive
                className="group flex items-center gap-4 p-5"
              >
                <Logo className="h-12 w-12 rounded-xl" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-semibold text-foreground">
                      {exam.title}
                    </span>
                    <Badge variant="brand">{exam.examCode}</Badge>
                  </div>
                  <div className="tabular mt-1 text-sm text-muted-foreground">
                    {exam.vendor} · {exam.questionCount} questions · {exam.timeLimitMinutes} min
                  </div>
                </div>

                {/* Nudges right on hover — a small, cheap cue that the whole
                    card is the link, not just the title. */}
                <ArrowRight
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-[transform,color] duration-200 ease-[var(--ease-spring)] group-hover:translate-x-1 group-hover:text-brand-500"
                  aria-hidden="true"
                />
              </Card>
            </li>
          ))}
        </ul>

        {exams.length === 0 && (
          <Card className="mt-5 p-8 text-center">
            <p className="text-muted-foreground">No certifications available yet.</p>
          </Card>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-fluid-xl font-semibold text-foreground">What&apos;s inside</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, label, hint }) => (
            <li key={label} className="reveal">
              <Card className="flex h-full items-start gap-3.5 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">{label}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>
                </span>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          More certifications coming soon.
        </p>
      </section>
    </main>
  );
}
