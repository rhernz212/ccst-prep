import * as cheerio from "cheerio";
import { readFileSync } from "fs";
import { sanitizeChapterHtml } from "./sanitize";
import { rewriteImages, type ImagePaths } from "./rewrite-images";

export interface ParsedChoice {
  label: string;
  body: string;
}

export interface ParsedReviewQuestion {
  /** 1-based position within this chapter's Review Questions list — the
   * correlation key against parse-answers.ts's output, since the two
   * files use unrelated id schemes (c01-ex-0001 vs bapp01-ex-0001). */
  ordinal: number;
  stem: string;
  choices: ParsedChoice[];
}

const LETTERS = "ABCDEFGHIJ".split("");

/**
 * Extracts the multiple-choice Review Questions from a single chapter
 * file. A handful of the book's review questions are fill-in-the-blank
 * (no lettered <ol>) — those come back with an empty choices array and
 * are filtered out later during merge with the answer key, since the DB
 * schema only models discrete-choice questions.
 */
export async function parseReviewQuestions(
  chapterXhtmlPath: string,
  reviewSectionAnchorId: string,
  imagePaths: ImagePaths
): Promise<ParsedReviewQuestion[]> {
  const xml = readFileSync(chapterXhtmlPath, "utf-8");
  const $ = cheerio.load(xml, { xmlMode: true });

  const reviewSection = $(`body section[aria-labelledby="${reviewSectionAnchorId}"]`).first();
  if (reviewSection.length === 0) {
    throw new Error(
      `Review Questions section ${reviewSectionAnchorId} not found in ${chapterXhtmlPath}`
    );
  }

  // Same corruption risk as parse-chapter.ts: self-closed <span/> bookmarks
  // must be stripped before any HTML round-trip through sanitize-html.
  reviewSection.find("span").each((_, el) => {
    const $el = $(el);
    if ($el.contents().length === 0) $el.remove();
  });

  // A few review questions embed a diagram in the stem. Rewrite before the
  // stem/choice split below so both branches inherit the corrected src.
  await rewriteImages($, reviewSection, imagePaths);

  const questionItems = reviewSection.find("> section > ol > li");
  const questions: ParsedReviewQuestion[] = [];

  questionItems.each((i, li) => {
    const $li = $(li);
    const $choicesList = $li.find("> ol.upper-alpha").first();

    const $stemClone = $li.clone();
    $stemClone.find("> ol.upper-alpha").remove();
    const stem = sanitizeChapterHtml($stemClone.html() ?? "").trim();

    const choices: ParsedChoice[] = [];
    $choicesList.find("> li").each((choiceIndex, choiceEl) => {
      choices.push({
        label: LETTERS[choiceIndex] ?? String(choiceIndex + 1),
        body: sanitizeChapterHtml($(choiceEl).html() ?? "").trim(),
      });
    });

    questions.push({ ordinal: i + 1, stem, choices });
  });

  return questions;
}
