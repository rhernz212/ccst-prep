import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

export interface ExamNote {
  id: string;
  body: string;
  updatedAt: string;
  /** Null for a chapter-level note; the notes tab links to the chapter top. */
  sectionAnchorId: string | null;
  sectionTitle: string | null;
}

export interface ChapterNotes {
  chapterNumber: number;
  chapterSlug: string;
  chapterTitle: string;
  notes: ExamNote[];
}

/**
 * Every note the signed-in user has written for one exam, grouped by chapter
 * in reading order. Returns null when signed out — the notes tab has nothing
 * to show and says so, rather than rendering an empty state that looks like
 * data loss.
 *
 * Chapter/section titles come from the DB rather than the content JSON so the
 * whole page is one round-trip; the two are seeded from the same source (see
 * scripts/ingest/seed-db.ts).
 */
export async function getExamNotes(examSlug: string): Promise<ChapterNotes[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data: examRow } = await supabase
    .from("exams")
    .select("id")
    .eq("slug", examSlug)
    .maybeSingle();
  if (!examRow) return [];

  // Notes are user-scoped and chapters are exam-scoped, so the join does the
  // filtering that neither table can do alone. !inner keeps it an inner join:
  // without it a note whose chapter belongs to another exam comes back with a
  // null chapter rather than being excluded.
  const { data } = await supabase
    .from("chapter_notes")
    .select(
      "id, body, updated_at, chapters!inner(number, slug, title, exam_id), sections(anchor_id, title, order_index)"
    )
    .eq("user_id", user.id)
    .eq("chapters.exam_id", examRow.id);

  type Row = {
    id: string;
    body: string;
    updated_at: string;
    chapters: { number: number; slug: string; title: string };
    sections: { anchor_id: string; title: string; order_index: number } | null;
  };

  const byChapter = new Map<number, ChapterNotes & { orders: Map<string, number> }>();

  for (const row of (data ?? []) as unknown as Row[]) {
    const chapter = row.chapters;
    let entry = byChapter.get(chapter.number);
    if (!entry) {
      entry = {
        chapterNumber: chapter.number,
        chapterSlug: chapter.slug,
        chapterTitle: chapter.title,
        notes: [],
        orders: new Map(),
      };
      byChapter.set(chapter.number, entry);
    }
    entry.notes.push({
      id: row.id,
      body: row.body,
      updatedAt: row.updated_at,
      sectionAnchorId: row.sections?.anchor_id ?? null,
      sectionTitle: row.sections?.title ?? null,
    });
    if (row.sections) entry.orders.set(row.id, row.sections.order_index);
  }

  // Reading order throughout — chapters by number, notes by their section's
  // position in the chapter, with the chapter-level note first.
  return [...byChapter.values()]
    .sort((a, b) => a.chapterNumber - b.chapterNumber)
    .map(({ orders, ...chapter }) => ({
      ...chapter,
      notes: chapter.notes.sort(
        (a, b) => (orders.get(a.id) ?? -1) - (orders.get(b.id) ?? -1)
      ),
    }));
}
