import Link from "next/link";
import { notFound } from "next/navigation";
import { getExamMeta } from "@/lib/content/exam-content";
import { ExamTabNav } from "@/components/ui/ExamTabNav";

export default async function ExamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <Link href="/" className="text-sm text-gray-500 hover:underline">
            ← All certifications
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{exam.title}</h1>
          <p className="mb-3 text-sm text-gray-500">
            {exam.vendor} · {exam.examCode}
          </p>
        </div>
        <ExamTabNav examSlug={examSlug} />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
