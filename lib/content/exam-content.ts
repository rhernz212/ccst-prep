import "server-only";
import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import type { Chapter, ExamMeta } from "./types";

const CONTENT_ROOT = path.join(process.cwd(), "content", "exams");

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
  const chaptersDir = path.join(CONTENT_ROOT, examSlug, "chapters");
  if (!existsSync(chaptersDir)) return [];

  const chapters = readdirSync(chaptersDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(path.join(chaptersDir, file), "utf-8")) as Chapter);

  chapters.sort((a, b) => a.number - b.number);
  return chapters;
}

export function getChapter(examSlug: string, chapterSlug: string): Chapter | null {
  return listChapters(examSlug).find((c) => c.slug === chapterSlug) ?? null;
}
