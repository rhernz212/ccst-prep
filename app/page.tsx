import { listExams } from "@/lib/content/exam-content";
import { Card } from "@/components/ui/Card";

export default function Home() {
  const exams = listExams();

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-16 animate-fade-in-up">
        <h1 className="text-3xl font-bold text-foreground">Welcome back.</h1>
        <p className="mt-2 text-muted-foreground">Which certification are you working on?</p>

        <ul className="mt-8 space-y-3">
          {exams.map((exam) => (
            <li key={exam.slug}>
              <Card href={`/exams/${exam.slug}`} interactive className="p-5">
                <div className="font-semibold text-foreground">{exam.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {exam.vendor} · {exam.examCode} · {exam.timeLimitMinutes} min ·{" "}
                  {exam.questionCount} questions
                </div>
              </Card>
            </li>
          ))}
        </ul>

        {exams.length === 0 && (
          <p className="mt-8 text-muted-foreground">No certifications available yet.</p>
        )}

        <p className="mt-10 text-sm text-muted-foreground">More certifications coming soon.</p>
      </main>
    </div>
  );
}
