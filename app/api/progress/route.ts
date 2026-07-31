import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const chapterId = body?.chapterId;
  const sectionId = body?.sectionId;

  if (typeof chapterId !== "string" || typeof sectionId !== "string") {
    return NextResponse.json(
      { error: "chapterId and sectionId are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("chapter_progress").upsert(
    { user_id: user.id, chapter_id: chapterId, section_id: sectionId },
    { onConflict: "user_id,chapter_id,section_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
