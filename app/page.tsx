import Link from "next/link";
import { listExams } from "@/lib/content/exam-content";

export default function Home() {
  const exams = listExams();

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back.</h1>
        <p className="mt-2 text-gray-600">Which certification are you working on?</p>

        <ul className="mt-8 space-y-3">
          {exams.map((exam) => (
            <li key={exam.slug}>
              <Link
                href={`/exams/${exam.slug}`}
                className="block rounded-lg border border-gray-200 p-5 transition hover:border-blue-400 hover:shadow-sm"
              >
                <div className="font-semibold text-gray-900">{exam.title}</div>
                <div className="mt-1 text-sm text-gray-500">
                  {exam.vendor} · {exam.examCode} · {exam.timeLimitMinutes} min ·{" "}
                  {exam.questionCount} questions
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {exams.length === 0 && (
          <p className="mt-8 text-gray-500">No certifications available yet.</p>
        )}

        <p className="mt-10 text-sm text-gray-400">More certifications coming soon.</p>
      </main>
    </div>
  );
}
