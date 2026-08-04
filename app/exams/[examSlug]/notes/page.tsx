import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, NotebookPen } from "lucide-react";
import { getExamMeta } from "@/lib/content/exam-content";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getExamNotes } from "@/lib/notes/get-exam-notes";
import { chapterHue } from "@/lib/ui/chapter-hue";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function NotesPage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  const exam = getExamMeta(examSlug);
  if (!exam) notFound();

  // The tab is hidden from the nav when signed out, so this only catches a
  // direct URL — but notes are the one thing in the app that are purely the
  // user's own, so it can't fall through to an empty page.
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(`/exams/${examSlug}/notes`)}`);
  }

  const chapters = (await getExamNotes(examSlug)) ?? [];
  const total = chapters.reduce((sum, chapter) => sum + chapter.notes.length, 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-fluid-xl font-semibold text-foreground">Notes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {total === 0
            ? "Everything you jot down while reading collects here."
            : `${total} note${total === 1 ? "" : "s"} across ${chapters.length} chapter${
                chapters.length === 1 ? "" : "s"
              }.`}
        </p>
      </div>

      {total === 0 ? (
        <Card className="aura mx-auto max-w-lg p-8 text-center sm:p-10">
          <span
            className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-white shadow-raised"
            aria-hidden="true"
          >
            <NotebookPen className="h-6 w-6" />
          </span>
          <h3 className="text-fluid-lg font-semibold text-foreground">No notes yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            While you&apos;re reading a chapter, tap the <strong>notepad button</strong> in the
            corner to jot something down without losing your place. Whatever you write shows up
            here, grouped by chapter, so you can skim it all before an exam.
          </p>
          <Button href={`/exams/${examSlug}/study`} className="mt-6">
            Go to Study Material
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Card>
      ) : (
        <ul className="space-y-4">
          {chapters.map((chapter) => (
            <li key={chapter.chapterSlug} className="reveal">
              <Card className="overflow-hidden">
                <div className="flex items-start gap-3.5 border-b border-border p-4">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white shadow-raised"
                    style={{
                      background: `linear-gradient(160deg, ${chapterHue(chapter.chapterNumber, 1.18)}, ${chapterHue(chapter.chapterNumber)})`,
                    }}
                    aria-hidden="true"
                  >
                    <span className="tabular">{chapter.chapterNumber}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Chapter {chapter.chapterNumber}
                    </div>
                    <h3 className="leading-snug font-semibold text-balance text-foreground">
                      {chapter.chapterTitle}
                    </h3>
                  </div>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">
                    {chapter.notes.length} note{chapter.notes.length === 1 ? "" : "s"}
                  </span>
                </div>

                <ul className="divide-y divide-border">
                  {chapter.notes.map((note) => (
                    <li key={note.id} className="p-4">
                      <Link
                        href={`/exams/${examSlug}/study/${chapter.chapterSlug}${
                          note.sectionAnchorId ? `#${note.sectionAnchorId}` : ""
                        }`}
                        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 transition-colors hover:text-brand-500 dark:text-brand-300"
                      >
                        {note.sectionTitle ?? "Chapter overview"}
                        <ArrowRight
                          className="h-3 w-3 transition-transform duration-200 ease-[var(--ease-spring)] group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                      {/* whitespace-pre-wrap: notes are plain text and the line
                          breaks the reader typed are most of the structure
                          they have. */}
                      <p className="mt-1.5 text-sm whitespace-pre-wrap text-foreground">
                        {note.body}
                      </p>
                      <time
                        dateTime={note.updatedAt}
                        className="mt-2 block text-xs text-muted-foreground"
                      >
                        {new Date(note.updatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
