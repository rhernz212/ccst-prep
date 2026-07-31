import "server-only";
import { createClient } from "@/lib/supabase/server";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: examRow } = await supabase
    .from("exams")
    .select("id")
    .eq("slug", examSlug)
    .maybeSingle();
  if (!examRow) return null;

  const { data: chapterRow } = await supabase
    .from("chapters")
    .select("id")
    .eq("exam_id", examRow.id)
    .eq("number", chapterNumber)
    .maybeSingle();
  if (!chapterRow) return null;

  const { data: sectionRows } = await supabase
    .from("sections")
    .select("id, anchor_id")
    .eq("chapter_id", chapterRow.id);

  const sectionIdByAnchor = new Map(
    (sectionRows ?? []).map((s) => [s.anchor_id as string, s.id as string])
  );

  let readAnchorIds = new Set<string>();
  if (user) {
    const { data: progressRows } = await supabase
      .from("chapter_progress")
      .select("section_id")
      .eq("user_id", user.id)
      .eq("chapter_id", chapterRow.id);

    const readSectionIds = new Set((progressRows ?? []).map((p) => p.section_id as string));
    readAnchorIds = new Set(
      [...sectionIdByAnchor.entries()]
        .filter(([, sectionId]) => readSectionIds.has(sectionId))
        .map(([anchorId]) => anchorId)
    );
  }

  return {
    chapterId: chapterRow.id,
    sectionIdByAnchor,
    readAnchorIds,
    userId: user?.id ?? null,
  };
}
