import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Mirrors the length check on chapter_notes.body, so an over-long note is
 *  rejected with a useful message instead of a raw constraint violation. */
const MAX_BODY_LENGTH = 10000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const chapterId = payload?.chapterId;
  const sectionId = payload?.sectionId ?? null;
  const body = payload?.body;

  if (typeof chapterId !== "string" || typeof body !== "string") {
    return NextResponse.json({ error: "chapterId and body are required" }, { status: 400 });
  }
  if (sectionId !== null && typeof sectionId !== "string") {
    return NextResponse.json({ error: "sectionId must be a string or null" }, { status: 400 });
  }
  if (body.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `Notes are limited to ${MAX_BODY_LENGTH} characters` },
      { status: 400 }
    );
  }

  // An emptied note is a deleted note. Storing '' would leave the row behind
  // and keep the section showing up as annotated in the notes tab and the
  // chapter nav.
  const trimmed = body.trim();
  if (trimmed === "") {
    const query = supabase
      .from("chapter_notes")
      .delete()
      .eq("user_id", user.id)
      .eq("chapter_id", chapterId);

    const { error } = await (sectionId === null
      ? query.is("section_id", null)
      : query.eq("section_id", sectionId));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deleted: true });
  }

  const { error } = await supabase.from("chapter_notes").upsert(
    {
      user_id: user.id,
      chapter_id: chapterId,
      section_id: sectionId,
      body: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,chapter_id,section_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Deletes one note by id, for the Notes tab's per-note delete.
 *
 * POST already deletes when the body is emptied, but that path addresses a
 * note by (chapter, section) — which is what the editor knows. The Notes tab
 * knows the row id instead, and routing it back through the editor's key
 * would mean re-deriving a section id it has no reason to hold.
 *
 * The id arrives in the body rather than the query string so it stays out of
 * request logs and browser history.
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const noteId = payload?.noteId;

  if (typeof noteId !== "string") {
    return NextResponse.json({ error: "noteId is required" }, { status: 400 });
  }

  // RLS already confines this to the caller's rows; the explicit user_id
  // filter means a policy regression can't turn this into a delete-anything.
  const { error } = await supabase
    .from("chapter_notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
