import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import type { Blueprint, Chapter, ExamMeta, QuestionBankEntry } from "./types";

const CONTENT_ROOT = path.join(process.cwd(), "content", "exams");

/**
 * Parsed chapters, memoized per exam. Rendering one chapter page used to
 * read and JSON.parse all twelve files (~930 KB) on every request, because
 * both the nav and the lookup-by-slug went through listChapters().
 *
 * Disabled outside production so editing a chapter JSON during development
 * doesn't require a server restart — the content files are committed
 * artifacts, so in production they can't change under a running process.
 */
const chapterCache = new Map<string, Chapter[]>();
const shouldCache = process.env.NODE_ENV === "production";

export function listExams(): ExamMeta[] {
  if (!existsSync(CONTENT_ROOT)) return [];
  return readdirSync(CONTENT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => getExamMeta(entry.name))
    .filter((meta): meta is ExamMeta => meta !== null);
}

export function getExamMeta(examSlug: string): ExamMeta | null {
  const metaPath = path.join(CONTENT_ROOT, examSlug, "meta.json");
  if (!existsSync(metaPath)) return null;
  return JSON.parse(readFileSync(metaPath, "utf-8")) as ExamMeta;
}

export function listChapters(examSlug: string): Chapter[] {
  const cached = chapterCache.get(examSlug);
  if (cached) return cached;

  const chaptersDir = path.join(CONTENT_ROOT, examSlug, "chapters");
  if (!existsSync(chaptersDir)) return [];

  const chapters = readdirSync(chaptersDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(path.join(chaptersDir, file), "utf-8")) as Chapter);

  chapters.sort((a, b) => a.number - b.number);
  if (shouldCache) chapterCache.set(examSlug, chapters);
  return chapters;
}

export function getChapter(examSlug: string, chapterSlug: string): Chapter | null {
  return listChapters(examSlug).find((c) => c.slug === chapterSlug) ?? null;
}

export function getBlueprint(examSlug: string): Blueprint | null {
  const blueprintPath = path.join(CONTENT_ROOT, examSlug, "blueprint.json");
  if (!existsSync(blueprintPath)) return null;
  return JSON.parse(readFileSync(blueprintPath, "utf-8")) as Blueprint;
}

export function listQuestions(examSlug: string): QuestionBankEntry[] {
  const questionsPath = path.join(CONTENT_ROOT, examSlug, "questions.json");
  if (!existsSync(questionsPath)) return [];
  return JSON.parse(readFileSync(questionsPath, "utf-8")) as QuestionBankEntry[];
}
