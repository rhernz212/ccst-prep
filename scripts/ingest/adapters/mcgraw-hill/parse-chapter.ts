import * as cheerio from "cheerio";
import { readFileSync } from "fs";
import type { Element } from "domhandler";
import type { Chapter, ChapterSection } from "@/lib/content/types";
import { sanitizeChapterHtml } from "../../sanitize";
import { rewriteImages } from "../../rewrite-images";
import type { ChapterContext } from "../types";
import { sliceChapter, renderElements } from "./slice";

/** The heading that holds this series' review questions and their answers. */
export const REVIEW_SECTION_TITLE = /^chapter review$/i;

/**
 * Margin labels carried over from the print edition, where they flag the
 * transition from background reading to exam material. The book's own
 * contents page files them in a side-toc rather than the main flow, and they
 * make poor section headings — "Test Specific" heads 76% of chapter 1.
 */
const MARGIN_MARKER = /^(Historical\/Conceptual|Test Specific|Beyond Network\+)$/i;

export function loadChapterRoot(chapterXhtmlPath: string) {
  const xml = readFileSync(chapterXhtmlPath, "utf-8");
  const $ = cheerio.load(xml, { xmlMode: true });
  const root = $("body > section").first();
  if (root.length === 0) {
    throw new Error(`No top-level chapter <section> found in ${chapterXhtmlPath}`);
  }

  // The source marks page boundaries with self-closing `<span
  // epub:type="pagebreak" id="page_230"/>`. `span` is not a void element in
  // HTML5, so once this fragment is re-parsed as HTML (by sanitize-html
  // downstream) an empty self-closed span reads as an unclosed opening tag
  // that swallows every following sibling until the next `</span>`. Strip
  // them while the tree is still correctly XML-parsed — empty elements are
  // genuinely empty here. Done at load so chapter bodies, review questions,
  // and the answer key all get it.
  root.find("span").each((_, el) => {
    const $el = $(el);
    if ($el.contents().length === 0) $el.remove();
  });

  return { $, root };
}

/**
 * Splits a margin marker's body at its `<h4>` boundaries so the subsections
 * can stand in for it.
 *
 * Returns null when that can't be done losslessly — no subsections to
 * promote, content sitting before the first one, or a heading with no id to
 * anchor against — leaving the caller to emit the marker unchanged.
 */
function promoteSubsections(
  $: cheerio.CheerioAPI,
  body: Element[]
): Array<{ anchorId: string; title: string; html: string }> | null {
  const firstHeading = body.findIndex((el) => el.tagName === "h4");
  if (firstHeading !== 0) return null;

  const starts = body.flatMap((el, i) => (el.tagName === "h4" ? [i] : []));
  const subsections = starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : body.length;
    const elements = body.slice(start, end);
    const $heading = $(elements[0]);

    // Standing in for the marker makes these top-level sections, so the
    // heading is re-emitted as <h3> to match every other section's leading
    // level instead of staying a subordinate <h4>.
    const $promoted = $("<h3></h3>")
      .attr($heading.attr() ?? {})
      .html($heading.html() ?? "");

    return {
      anchorId: $heading.attr("id") ?? "",
      title: $heading.text().replace(/\s+/g, " ").trim(),
      html: sanitizeChapterHtml(
        $.html($promoted) + renderElements($, elements.slice(1))
      ),
    };
  });

  if (subsections.some((s) => s.anchorId === "" || s.title === "")) return null;
  return subsections;
}

export async function parseChapter(opts: ChapterContext): Promise<Chapter> {
  const { $, root } = loadChapterRoot(opts.chapterXhtmlPath);

  const { opening, byAnchor } = sliceChapter(
    $,
    root,
    opts.nav.sections.map((s) => s.anchorId),
    opts.chapterXhtmlPath
  );

  // Image rewriting mutates in place, so do it once over the whole chapter
  // before anything is serialized — slices are views onto the same tree.
  await rewriteImages($, root, opts);

  // The opening block reprints "CHAPTER 1" and the chapter title as <h2>s.
  // The study page header already renders both, so drop them and keep the
  // exam-objectives checklist that follows — matching what the Sybex adapter
  // emits, where the chapter opening never contained them in the first place.
  const openingBody = opening.filter((el) => el.tagName !== "h2");
  for (const el of openingBody) $(el).find("h2").remove();
  const introHtml = sanitizeChapterHtml(renderElements($, openingBody));

  const sections: ChapterSection[] = [];
  const push = (section: Omit<ChapterSection, "order">) => {
    // Renumbered as emitted rather than carried over from the TOC, since
    // dropped markers and promoted subsections both shift the sequence.
    sections.push({ ...section, order: sections.length });
  };

  for (const navSection of opts.nav.sections) {
    const elements = byAnchor.get(navSection.anchorId) ?? [];

    if (REVIEW_SECTION_TITLE.test(navSection.title)) {
      // Questions and answers are printed inline in this series, so the
      // section is replaced rather than rendered — otherwise the study page
      // would show every answer directly beneath its question. The questions
      // themselves are extracted separately into the question bank.
      push({
        anchorId: navSection.anchorId,
        title: navSection.title,
        isReviewQuestions: true,
        html: `<h3 id="${navSection.anchorId}">${navSection.title}</h3><p>Test your knowledge of this chapter in the Practice Quizzes tab.</p>`,
      });
      continue;
    }

    const body = elements.slice(1);
    const hasContent = body.some(
      (el) => $(el).text().trim().length > 0 || $(el).find("img").length > 0
    );

    if (MARGIN_MARKER.test(navSection.title)) {
      // Most markers are empty and would render as a bare heading.
      if (!hasContent) continue;

      // The rest head real material, so the heading is unwrapped rather than
      // dropped: where the marker is followed straight into `<h4>`
      // subsections, those become sections in its place. Only applied when
      // nothing precedes the first `<h4>`, so no content is ever orphaned.
      const promoted = promoteSubsections($, body);
      if (promoted) {
        for (const sub of promoted) push({ ...sub, isReviewQuestions: false });
        continue;
      }
      // Otherwise it's a short lead-in with no subsections to promote —
      // keep it as its own section rather than lose the text.
    } else if (!hasContent) {
      continue;
    }

    push({
      anchorId: navSection.anchorId,
      title: navSection.title,
      isReviewQuestions: false,
      html: sanitizeChapterHtml(renderElements($, elements)),
    });
  }

  return {
    slug: opts.nav.slug,
    number: opts.nav.number,
    title: opts.nav.title,
    introHtml,
    sections,
  };
}
