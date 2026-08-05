import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SearchHit } from "@/lib/search/types";

const MAX_RESULTS = 12;
/** Long enough for a phrase, short enough that nobody is probing with essays. */
const MAX_QUERY_LENGTH = 120;

interface SearchRow {
  chapter_number: number;
  chapter_slug: string;
  chapter_title: string;
  section_title: string;
  anchor_id: string;
  snippet: string;
  rank: number;
}

/**
 * Searches one exam's chapter text.
 *
 * Ranking and snippet extraction live in the `search_sections` function (see
 * 20260805091000_section_search.sql) because neither ts_rank nor ts_headline
 * can be expressed through PostgREST's query syntax. This route is the thin
 * validating wrapper around it.
 *
 * Open to signed-out readers, like the chapters it searches.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const examSlug = searchParams.get("exam");
  const query = (searchParams.get("q") ?? "").trim();

  if (!examSlug) {
    return NextResponse.json({ error: "exam is required" }, { status: 400 });
  }

  // An empty query is a normal state — the palette is open and nothing has
  // been typed yet — so it's an empty result, not an error.
  if (query.length === 0) {
    return NextResponse.json({ hits: [] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_sections", {
    exam_slug: examSlug,
    search_query: query.slice(0, MAX_QUERY_LENGTH),
    max_results: MAX_RESULTS,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hits: SearchHit[] = ((data ?? []) as SearchRow[]).map((row) => ({
    chapterNumber: row.chapter_number,
    chapterSlug: row.chapter_slug,
    chapterTitle: row.chapter_title,
    sectionTitle: row.section_title,
    anchorId: row.anchor_id,
    snippet: row.snippet,
  }));

  return NextResponse.json({ hits });
}
