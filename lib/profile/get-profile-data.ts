import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { listChapters, listExams } from "@/lib/content/exam-content";
import {
  aggregateDomainPerformance,
  summarizeTrend,
  type AttemptTrend,
  type DomainPerformance,
} from "@/lib/domain/exam/attemptHistory";
import {
  daysBetween,
  localDayKey,
  summarizeActivity,
  type StudyActivity,
} from "@/lib/domain/profile/studyActivity";
import type { DomainBreakdownEntry } from "@/lib/exam/types";

const WEAKEST_DOMAINS_SHOWN = 3;

export interface CertProgress {
  slug: string;
  title: string;
  examCode: string;
  targetScore?: number;
  /** YYYY-MM-DD, as entered by the user. Null until they set one. */
  examDate: string | null;
  /** Negative once the date has passed; null when no date is set. */
  daysUntilExam: number | null;
  trend: AttemptTrend | null;
  weakestDomains: DomainPerformance[];
  sectionsRead: number;
  sectionTotal: number;
  reviewDue: number;
  notesCount: number;
}

export interface ProfileData {
  email: string;
  displayName: string | null;
  joinedAt: string;
  /** The zone every date on the page is computed in — UTC until one is stored. */
  timeZone: string;
  /** What's actually on the profile row, so the client knows whether to write. */
  storedTimeZone: string | null;
  /** Today in the user's zone — every date the page renders is relative to it. */
  todayKey: string;
  activity: StudyActivity;
  certs: CertProgress[];
  totalNotes: number;
  totalReviewDue: number;
}

/** Shapes for the embedded joins, which the generated client types as loose. */
type ExamScopedRow = { chapters: { exam_id: string } };
type QuestionScopedRow = { due_at: string; last_reviewed_at: string | null; questions: { exam_id: string } };

/**
 * Everything the profile page renders, for the signed-in user.
 *
 * Deliberately one function rather than a loader per panel: almost every
 * panel is a different projection of the same handful of user-owned tables,
 * and splitting them would mean fetching `chapter_progress` three times to
 * answer "what days did you study", "how far through the book are you" and
 * "which certification was that for". The queries below issue together and
 * each returns a single narrow column set.
 *
 * Returns null when signed out; the page redirects rather than rendering an
 * empty shell.
 */
export async function getProfileData(): Promise<ProfileData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const exams = listExams();

  const [
    { data: profileRow },
    { data: examRows },
    { data: progressRows },
    { data: quizRows },
    { data: examAttemptRows },
    { data: reviewRows },
    { data: noteRows },
    { data: settingRows },
  ] = await Promise.all([
    supabase.from("profiles").select("display_name, timezone").eq("id", user.id).maybeSingle(),
    supabase.from("exams").select("id, slug"),
    supabase
      .from("chapter_progress")
      .select("read_at, chapters!inner(exam_id)")
      .eq("user_id", user.id),
    supabase.from("quiz_attempts").select("started_at").eq("user_id", user.id),
    supabase
      .from("exam_attempts")
      .select("exam_id, status, score, started_at, submitted_at, domain_breakdown")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("question_review_state")
      .select("due_at, last_reviewed_at, questions!inner(exam_id)")
      .eq("user_id", user.id),
    supabase.from("chapter_notes").select("chapters!inner(exam_id)").eq("user_id", user.id),
    supabase.from("user_exam_settings").select("exam_id, exam_date").eq("user_id", user.id),
  ]);

  const storedTimeZone = profileRow?.timezone ?? null;
  const timeZone = storedTimeZone ?? "UTC";
  const todayKey = localDayKey(new Date(), timeZone);
  const nowIso = new Date().toISOString();

  const progress = (progressRows ?? []) as unknown as (ExamScopedRow & { read_at: string })[];
  const reviews = (reviewRows ?? []) as unknown as QuestionScopedRow[];
  const notes = (noteRows ?? []) as unknown as ExamScopedRow[];

  // Every timestamp that means "you did some studying". Exam attempts count
  // from when they were started rather than submitted: a two-hour sitting
  // belongs to the day you sat down for it.
  const activity = summarizeActivity(
    [
      ...progress.map((row) => row.read_at),
      ...(quizRows ?? []).map((row) => row.started_at),
      ...(examAttemptRows ?? []).map((row) => row.started_at),
      ...reviews.map((row) => row.last_reviewed_at),
    ],
    timeZone,
    todayKey
  );

  const examIdBySlug = new Map((examRows ?? []).map((row) => [row.slug as string, row.id as string]));
  const examDateById = new Map(
    (settingRows ?? []).map((row) => [row.exam_id as string, row.exam_date as string | null])
  );

  const countByExam = <T>(rows: T[], examIdOf: (row: T) => string) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const id = examIdOf(row);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  };

  const sectionsReadByExam = countByExam(progress, (row) => row.chapters.exam_id);
  const notesByExam = countByExam(notes, (row) => row.chapters.exam_id);
  const dueByExam = countByExam(
    reviews.filter((row) => row.due_at <= nowIso),
    (row) => row.questions.exam_id
  );

  const certs: CertProgress[] = exams.map((exam) => {
    const examId = examIdBySlug.get(exam.slug);
    const examDate = examId ? (examDateById.get(examId) ?? null) : null;

    // Newest-first already, and unfinished attempts have no score to trend.
    const attempts = (examAttemptRows ?? [])
      .filter((row) => row.exam_id === examId && row.status !== "in_progress")
      .map((row) => ({
        score: row.score ?? 0,
        domainBreakdown: (row.domain_breakdown ?? []) as DomainBreakdownEntry[],
      }));

    const sectionTotal = listChapters(exam.slug).reduce(
      (total, chapter) => total + chapter.sections.length,
      0
    );

    return {
      slug: exam.slug,
      title: exam.title,
      examCode: exam.examCode,
      targetScore: exam.targetScore,
      examDate,
      daysUntilExam: examDate ? daysBetween(todayKey, examDate) : null,
      trend: summarizeTrend(attempts),
      weakestDomains: aggregateDomainPerformance(attempts).slice(0, WEAKEST_DOMAINS_SHOWN),
      sectionsRead: examId ? (sectionsReadByExam.get(examId) ?? 0) : 0,
      sectionTotal,
      reviewDue: examId ? (dueByExam.get(examId) ?? 0) : 0,
      notesCount: examId ? (notesByExam.get(examId) ?? 0) : 0,
    };
  });

  return {
    email: user.email ?? "",
    displayName: profileRow?.display_name ?? null,
    joinedAt: user.created_at,
    timeZone,
    storedTimeZone,
    todayKey,
    activity,
    certs,
    totalNotes: notes.length,
    totalReviewDue: reviews.filter((row) => row.due_at <= nowIso).length,
  };
}
