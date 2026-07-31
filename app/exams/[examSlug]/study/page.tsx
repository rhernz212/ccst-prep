import { notFound } from "next/navigation";
import { getExamMeta, listChapters } from "@/lib/content/exam-content";
import { Card } from "@/components/ui/Card";

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
      <h2 className="mb-4 text-xl font-semibold text-foreground">Chapters</h2>
      {chapters.length === 0 && (
        <p className="text-muted-foreground">No chapters have been ingested yet.</p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {chapters.map((chapter) => (
          <li key={chapter.slug}>
            <Card href={`/exams/${examSlug}/study/${chapter.slug}`} interactive className="p-4">
              <div className="text-sm text-muted-foreground">Chapter {chapter.number}</div>
              <div className="font-medium text-foreground">{chapter.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {chapter.sections.length} sections
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
