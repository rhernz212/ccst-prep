import Link from "next/link";
import { notFound } from "next/navigation";
import { getExamMeta, listChapters } from "@/lib/content/exam-content";

export default async function StudyIndexPage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  const chapters = listChapters(examSlug);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Chapters</h2>
      {chapters.length === 0 && (
        <p className="text-gray-500">No chapters have been ingested yet.</p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {chapters.map((chapter) => (
          <li key={chapter.slug}>
            <Link
              href={`/exams/${examSlug}/study/${chapter.slug}`}
              className="block rounded-lg border border-gray-200 p-4 transition hover:border-blue-400 hover:shadow-sm"
            >
              <div className="text-sm text-gray-500">Chapter {chapter.number}</div>
              <div className="font-medium text-gray-900">{chapter.title}</div>
              <div className="mt-1 text-xs text-gray-400">
                {chapter.sections.length} sections
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
