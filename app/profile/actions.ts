"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Profile mutations.
 *
 * All three end in `refresh()` rather than `revalidatePath()`: none of this
 * data is in Next's cache to invalidate — it's read straight from Supabase on
 * every render — so what the page needs is a re-fetch of its RSC payload, not
 * a cache bust. See node_modules/next/dist/docs/.../server-actions.md.
 *
 * Every action re-reads the user from the session rather than trusting an id
 * from the form. A Server Action is a POST endpoint anyone can call.
 */

const MAX_DISPLAY_NAME = 60;

/** No cut score is being enforced here — this is just a sanity range so a
 *  typo'd year can't render a countdown of 700,000 days. */
const MIN_EXAM_DATE = "2000-01-01";
const MAX_EXAM_DATE = "2100-01-01";

export interface ActionResult {
  error?: string;
  saved?: boolean;
}

/*
 * The two form actions take (prevState, formData) so they can be handed
 * straight to useActionState instead of being wrapped in a client-side
 * closure — which is what keeps the forms working before hydration.
 */

export async function saveDisplayName(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required" };

  const raw = String(formData.get("displayName") ?? "").trim();
  if (raw.length > MAX_DISPLAY_NAME) {
    return { error: `Keep it under ${MAX_DISPLAY_NAME} characters` };
  }

  // An emptied field means "go back to showing my email", not an empty name.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: raw === "" ? null : raw }, { onConflict: "id" });

  if (error) return { error: error.message };

  refresh();
  return { saved: true };
}

export async function saveExamDate(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required" };

  const examSlug = String(formData.get("examSlug") ?? "");
  const examDate = String(formData.get("examDate") ?? "").trim();

  if (examSlug === "") return { error: "Which exam?" };
  if (examDate !== "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      return { error: "Use a YYYY-MM-DD date" };
    }
    // Round-tripping catches the dates the regex can't, like 2026-02-31.
    const parsed = new Date(`${examDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== examDate) {
      return { error: "That isn't a real date" };
    }
    if (examDate < MIN_EXAM_DATE || examDate > MAX_EXAM_DATE) {
      return { error: "Check the year" };
    }
  }

  // The slug→id lookup is what keeps the client from writing a row against an
  // arbitrary exam_id; a slug that doesn't exist simply has nowhere to go.
  const { data: examRow } = await supabase
    .from("exams")
    .select("id")
    .eq("slug", examSlug)
    .maybeSingle();
  if (!examRow) return { error: "Unknown exam" };

  const { error } = await supabase.from("user_exam_settings").upsert(
    {
      user_id: user.id,
      exam_id: examRow.id,
      exam_date: examDate === "" ? null : examDate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,exam_id" }
  );

  if (error) return { error: error.message };

  refresh();
  return { saved: true };
}

/**
 * Records the browser's IANA zone so study days can be bucketed by the user's
 * calendar. Called once from the client when the stored value is missing or
 * has changed — see TimeZoneSync.
 */
export async function saveTimeZone(timeZone: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required" };

  // Validated by asking Intl whether it can actually resolve the zone, which
  // is the only definition that matters to localDayKey downstream.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    return { error: "Unrecognised time zone" };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, timezone: timeZone }, { onConflict: "id" });

  if (error) return { error: error.message };

  refresh();
  return { saved: true };
}
