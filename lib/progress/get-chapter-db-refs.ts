import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

export interface ChapterDbRefs {
  chapterId: string;
  sectionIdByAnchor: Map<string, string>;
  readAnchorIds: Set<string>;
  userId: string | null;
}

/**
 * Resolves the DB ids progress-tracking needs for a chapter, and (if signed
 * in) which of its sections the current user has already read. Returns null
 * if this exam/chapter hasn't been seeded into Supabase yet (structural
 * metadata is seeded separately from the static content JSON — see
 * scripts/ingest/seed-db.ts) — callers should degrade gracefully rather
 * than error, since content can render from JSON regardless.
 */
export async function getChapterDbRefs(
  examSlug: string,
  chapterNumber: number
): Promise<ChapterDbRefs | null> {
  const supabase = await createClient();

  // The user lookup doesn't depend on the exam/chapter resolution, so it
  // overlaps with it rather than adding a round-trip in front of it.
  const [user, { data: examRow }] = await Promise.all([
    getCurrentUser(),
    supabase.from("exams").select("id").eq("slug", examSlug).maybeSingle(),
  ]);
  if (!examRow) return null;

  const { data: chapterRow } = await supabase
    .from("chapters")
    .select("id")
    .eq("exam_id", examRow.id)
    .eq("number", chapterNumber)
    .maybeSingle();
  if (!chapterRow) return null;

  // Both of these only need chapterRow.id, so they issue together.
  const [{ data: sectionRows }, { data: progressRows }] = await Promise.all([
    supabase.from("sections").select("id, anchor_id").eq("chapter_id", chapterRow.id),
    user
      ? supabase
          .from("chapter_progress")
          .select("section_id")
          .eq("user_id", user.id)
          .eq("chapter_id", chapterRow.id)
      : Promise.resolve({ data: null }),
  ]);

  const sectionIdByAnchor = new Map(
    (sectionRows ?? []).map((s) => [s.anchor_id as string, s.id as string])
  );

  const readSectionIds = new Set((progressRows ?? []).map((p) => p.section_id as string));
  const readAnchorIds = new Set(
    [...sectionIdByAnchor.entries()]
      .filter(([, sectionId]) => readSectionIds.has(sectionId))
      .map(([anchorId]) => anchorId)
  );

  return {
    chapterId: chapterRow.id,
    sectionIdByAnchor,
    readAnchorIds,
    userId: user?.id ?? null,
  };
}
