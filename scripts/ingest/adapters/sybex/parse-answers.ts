import * as cheerio from "cheerio";
import { readFileSync } from "fs";
import { sanitizeChapterHtml } from "../../sanitize";
import type { ParsedAnswer } from "../types";

/**
 * Parses the Appendix "Answers to Review Questions" file into a per-chapter
 * ordered list. Correlate to parse-review-questions.ts's output by ordinal
 * position within each chapter — the id schemes on the two sides
 * (c01-ex-0001 vs bapp01-ex-0001) are unrelated and not usable as keys.
 */
export function parseAnswers(answersXhtmlPath: string): Map<number, ParsedAnswer[]> {
  const xml = readFileSync(answersXhtmlPath, "utf-8");
  const $ = cheerio.load(xml, { xmlMode: true });

  const byChapter = new Map<number, ParsedAnswer[]>();

  $("h2[id^='head-2-']").each((_, h2El) => {
    const $h2 = $(h2El);
    const headingText = $h2.text().trim();
    const chapterMatch = headingText.match(/^Chapter\s+(\d+):/i);
    if (!chapterMatch) return;

    const chapterNumber = parseInt(chapterMatch[1], 10);
    const $chapterSection = $h2.parent();
    const $items = $chapterSection.find("> section > ol > li");

    const answers: ParsedAnswer[] = [];
    $items.each((i, li) => {
      const $li = $(li);
      $li.find("span").each((_, el) => {
        const $el = $(el);
        if ($el.contents().length === 0) $el.remove();
      });

      const rawHtml = $li.html() ?? "";
      const text = $li.text();
      const prefixMatch = text.match(/^\s*([A-Z](?:,\s*[A-Z])*)\.\s*/);
      const correctLabels = prefixMatch
        ? prefixMatch[1].split(",").map((s) => s.trim())
        : [];

      const explanationHtml = prefixMatch
        ? rawHtml.replace(/^(\s*[A-Z](?:,\s*[A-Z])*\.\s*)/, "")
        : rawHtml;

      answers.push({
        ordinal: i + 1,
        correctLabels,
        explanation: sanitizeChapterHtml(explanationHtml).trim(),
      });
    });

    byChapter.set(chapterNumber, answers);
  });

  return byChapter;
}
