import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { buildGarden, type Garden, type GardenEvent } from "@/lib/domain/garden/garden";
import {
  countByDay,
  currentStreak,
  localDayKey,
  longestStreak,
} from "@/lib/domain/profile/studyActivity";

export interface GardenData {
  garden: Garden;
  /** The zone every day boundary in the garden is drawn on. */
  timeZone: string;
  todayKey: string;
  currentStreak: number;
  longestStreak: number;
  /** Whether today already has a plant, so the page can say what's missing. */
  plantedToday: boolean;
}

/**
 * The garden for the signed-in user, or null when signed out.
 *
 * Reads the same four tables the profile page's heatmap does, but keeps the
 * rows apart by kind rather than flattening them into one list of instants —
 * a plant's species is decided by *what* you did that day, which is exactly
 * the distinction summarizeActivity throws away.
 */
export async function getGardenData(): Promise<GardenData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();

  const [
    { data: profileRow },
    { data: progressRows },
    { data: quizRows },
    { data: examRows },
    { data: reviewRows },
  ] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    supabase.from("chapter_progress").select("read_at").eq("user_id", user.id),
    supabase.from("quiz_attempts").select("started_at").eq("user_id", user.id),
    supabase.from("exam_attempts").select("started_at").eq("user_id", user.id),
    supabase
      .from("question_review_state")
      .select("last_reviewed_at")
      .eq("user_id", user.id)
      .not("last_reviewed_at", "is", null),
  ]);

  const timeZone = profileRow?.timezone ?? "UTC";
  const todayKey = localDayKey(new Date(), timeZone);

  // Exam and quiz attempts count from when they were started, not submitted:
  // a two-hour sitting belongs to the day you sat down for it.
  const events: GardenEvent[] = [
    ...(progressRows ?? []).map((row) => ({ kind: "read" as const, at: row.read_at })),
    ...(quizRows ?? []).map((row) => ({ kind: "quiz" as const, at: row.started_at })),
    ...(examRows ?? []).map((row) => ({ kind: "exam" as const, at: row.started_at })),
    ...(reviewRows ?? []).map((row) => ({
      kind: "review" as const,
      at: row.last_reviewed_at as string,
    })),
  ];

  const dayKeys = new Set(countByDay(events.map((event) => event.at), timeZone).keys());

  return {
    garden: buildGarden(events, timeZone),
    timeZone,
    todayKey,
    currentStreak: currentStreak(dayKeys, todayKey),
    longestStreak: longestStreak(dayKeys),
    plantedToday: dayKeys.has(todayKey),
  };
}
