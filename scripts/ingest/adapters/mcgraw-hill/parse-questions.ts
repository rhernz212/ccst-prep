import type * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { sanitizeChapterHtml } from "../../sanitize";
import { rewriteImages, type ImagePaths } from "../../rewrite-images";
import type { ParsedAnswer, ParsedChoice, ParsedReviewQuestion } from "../types";
import { loadChapterRoot } from "./parse-chapter";

/** Classes this series uses for a numbered item in the Questions/Answers lists. */
const ITEM_CLASSES = new Set(["ques", "ques1"]);
/** A lettered choice. */
const CHOICE_CLASS = "alpha";

/** Non-breaking spaces separate a label from its body throughout this series. */
function normalize(text: string): string {
  return text.replace(/ /g, " ");
}

function classOf($: cheerio.CheerioAPI, el: Element): string {
  return $(el).attr("class") ?? "";
}

function isNumberedItem($: cheerio.CheerioAPI, el: Element): boolean {
  return ITEM_CLASSES.has(classOf($, el)) && /^\s*\d+\./.test(normalize($(el).text()));
}

/** Removes leading whitespace-only nodes so the next real node is inspectable. */
function trimLeadingWhitespace($: cheerio.CheerioAPI, $el: cheerio.Cheerio<Element>): void {
  for (const node of $el.contents().toArray()) {
    if (node.type === "text" && normalize(node.data).trim() === "") {
      $(node).remove();
      continue;
    }
    break;
  }
}

/**
 * Drops the leading `<strong>N.</strong>` that opens every numbered item.
 * The number is wrapped in a cross-reference anchor, so this also removes the
 * question/answer back-links, which would otherwise be dead hrefs once the
 * two halves are split into separate records.
 */
function stripOrdinal($: cheerio.CheerioAPI, $el: cheerio.Cheerio<Element>): void {
  const $first = $el.find("> strong").first();
  if ($first.length > 0 && /^\s*\d+\s*\.?\s*$/.test(normalize($first.text()))) {
    $first.remove();
  }
  trimLeadingWhitespace($, $el);
}

/**
 * Pulls the correct-answer letters off the front of an answer item.
 *
 * The markup is inconsistent about where the letters end and the explanation
 * begins: usually they sit in one `<strong>` ("C.", "A, D."), but a handful
 * split across the boundary ("A, B," bolded, "and C." as plain text) or leave
 * the period outside the bold. Consuming nodes from the front until nothing
 * more looks like a label handles all three without special-casing.
 */
function takeCorrectLabels($: cheerio.CheerioAPI, $el: cheerio.Cheerio<Element>): string[] {
  const labels: string[] = [];

  for (;;) {
    trimLeadingWhitespace($, $el);
    const node = $el.contents().first().get(0);
    if (!node) break;

    if (node.type === "tag" && node.tagName === "strong") {
      const text = normalize($(node).text()).trim();
      if (!/^[A-Z](?:\s*,\s*[A-Z])*\s*[.,]?$/.test(text)) break;
      labels.push(...(text.match(/[A-Z]/g) ?? []));
      $(node).remove();
      continue;
    }

    // Multi-answer keys split across several bolds — "<strong>A, B,</strong>
    // and <strong>C.</strong>" — leaving the conjunction as plain text
    // between them.
    if (node.type === "text" && labels.length > 0) {
      const text = normalize(node.data);

      // A bare connector: drop it and look for the next bolded label.
      if (/^\s*(?:,\s*)?(?:and\s*)?$/.test(text)) {
        $(node).remove();
        continue;
      }

      // A trailing label that escaped the bold entirely. The connector is
      // required: without it "<strong>D.</strong> H.323 uses TCP port 1720"
      // would read "H." as a second correct answer, and the period must be
      // followed by a space so "H.323" can't match either way.
      const match = text.match(/^\s*(?:,\s*|and\s+|,\s*and\s+)([A-E])\s*[.,](?=\s|$)/);
      if (!match) break;
      labels.push(match[1]);
      node.data = node.data.slice(match[0].length);
      continue;
    }

    break;
  }

  // Tidy up a period stranded outside the bold ("<strong>B</strong>. The …").
  const first = $el.contents().first().get(0);
  if (first && first.type === "text") {
    first.data = first.data.replace(/^\s*[.,]?[ \s]*/, "");
  }

  return labels;
}

interface QuestionBlocks {
  questions: Element[];
  answers: Element[];
}

/**
 * Locates the Questions and Answers runs inside a chapter. Both are `<h4>`
 * headings under "Chapter Review", and the answers run to the end of the
 * chapter.
 */
function findBlocks($: cheerio.CheerioAPI, root: ReturnType<cheerio.CheerioAPI>, chapterPath: string): QuestionBlocks {
  const children = root.children().toArray();
  const headingIndex = (label: RegExp) =>
    children.findIndex((el) => el.tagName === "h4" && label.test($(el).text().trim()));

  const questionsAt = headingIndex(/^questions$/i);
  const answersAt = headingIndex(/^answers$/i);

  if (questionsAt < 0 || answersAt < 0) {
    throw new Error(
      `Could not find both a "Questions" and an "Answers" heading in ${chapterPath}`
    );
  }
  if (answersAt < questionsAt) {
    throw new Error(`"Answers" precedes "Questions" in ${chapterPath}`);
  }

  return {
    questions: children.slice(questionsAt + 1, answersAt),
    answers: children.slice(answersAt + 1),
  };
}

export async function parseReviewQuestions(
  chapterXhtmlPath: string,
  imagePaths: ImagePaths
): Promise<ParsedReviewQuestion[]> {
  const { $, root } = loadChapterRoot(chapterXhtmlPath);
  await rewriteImages($, root, imagePaths);

  const { questions: block } = findBlocks($, root, chapterXhtmlPath);
  const questions: ParsedReviewQuestion[] = [];

  let stemParts: string[] = [];
  let choices: ParsedChoice[] = [];

  const flush = () => {
    if (stemParts.length === 0) return;
    questions.push({
      ordinal: questions.length + 1,
      stem: sanitizeChapterHtml(stemParts.join("")).trim(),
      choices,
    });
    stemParts = [];
    choices = [];
  };

  for (const el of block) {
    if (isNumberedItem($, el)) {
      flush();
      const $clone = $(el).clone();
      stripOrdinal($, $clone);
      stemParts.push($clone.html() ?? "");
      continue;
    }

    if (stemParts.length === 0) continue;

    if (classOf($, el) === CHOICE_CLASS) {
      const $clone = $(el).clone();
      const $label = $clone.find("> strong").first();
      const labelMatch = normalize($label.text()).trim().match(/^([A-Z])\s*\./);
      if (!labelMatch) continue;
      $label.remove();
      trimLeadingWhitespace($, $clone);
      choices.push({
        label: labelMatch[1],
        body: sanitizeChapterHtml($clone.html() ?? "").trim(),
      });
      continue;
    }

    // A stem that spans several paragraphs — a routing table image and the
    // line that follows it, for instance. Anything before the first choice
    // still belongs to the question.
    if (choices.length === 0) {
      stemParts.push($.html(el));
    }
  }

  flush();
  return questions;
}

export function parseAnswers(
  chapterXhtmlPath: string
): ParsedAnswer[] {
  const { $, root } = loadChapterRoot(chapterXhtmlPath);
  const { answers: block } = findBlocks($, root, chapterXhtmlPath);

  const answers: ParsedAnswer[] = [];

  for (const el of block) {
    if (!isNumberedItem($, el)) continue;

    const $clone = $(el).clone();
    stripOrdinal($, $clone);
    const correctLabels = takeCorrectLabels($, $clone);

    answers.push({
      ordinal: answers.length + 1,
      correctLabels,
      explanation: sanitizeChapterHtml($clone.html() ?? "").trim(),
    });
  }

  return answers;
}
