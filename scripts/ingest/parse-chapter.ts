import * as cheerio from "cheerio";
import { readFileSync, copyFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import type { Chapter, ChapterSection, NavChapter } from "@/lib/content/types";
import { sanitizeChapterHtml } from "./sanitize";

interface ParseChapterOptions {
  chapterXhtmlPath: string;
  nav: NavChapter;
  sourceImagesDir: string;
  publicImagesDir: string;
  /** e.g. "/content/ccst-networking/images" */
  publicImagePathPrefix: string;
}

/**
 * The source XHTML uses self-closing `<span/>` for empty bookmark anchors
 * and pagebreak markers (e.g. `<span epub:type="pagebreak" id="Page_3"/>`).
 * `span` is not a void element in HTML5, so once this fragment is
 * re-parsed as HTML (by sanitize-html downstream), an empty self-closed
 * span is misread as an unclosed opening tag that swallows every sibling
 * after it until the next `</span>` — silently corrupting the document
 * structure. Strip these while the tree is still correctly XML-parsed
 * (empty elements are genuinely empty here), before any HTML round-trip.
 */
function stripEmptyBookmarkSpans($: cheerio.CheerioAPI, root: ReturnType<cheerio.CheerioAPI>) {
  root.find("span").each((_, el) => {
    const $el = $(el);
    if ($el.contents().length === 0) {
      $el.remove();
    }
  });
}

/**
 * Rewrites `images/foo.png` -> `<publicImagePathPrefix>/foo.png` inside a
 * cheerio-loaded fragment and copies the referenced file into publicImagesDir.
 */
function rewriteAndCopyImages(
  $: cheerio.CheerioAPI,
  root: ReturnType<cheerio.CheerioAPI>,
  opts: ParseChapterOptions
) {
  root.find("img").each((_, imgEl) => {
    const $img = $(imgEl);
    const src = $img.attr("src");
    if (!src) return;
    const filename = path.basename(src);
    const sourcePath = path.join(opts.sourceImagesDir, filename);
    const destPath = path.join(opts.publicImagesDir, filename);

    if (!existsSync(sourcePath)) {
      throw new Error(`Image referenced in chapter but missing from source: ${sourcePath}`);
    }
    mkdirSync(opts.publicImagesDir, { recursive: true });
    copyFileSync(sourcePath, destPath);

    $img.attr("src", `${opts.publicImagePathPrefix}/${filename}`);
  });
}

export function parseChapter(opts: ParseChapterOptions): Chapter {
  const xml = readFileSync(opts.chapterXhtmlPath, "utf-8");
  const $ = cheerio.load(xml, { xmlMode: true });

  const chapterRoot = $("body > section").first();
  if (chapterRoot.length === 0) {
    throw new Error(`No top-level chapter <section> found in ${opts.chapterXhtmlPath}`);
  }

  // Intro content: the "chapter opening" section before any named h2 section.
  const introSection = chapterRoot.find('> section[aria-label="chapter opening"]').first();
  stripEmptyBookmarkSpans($, introSection);
  rewriteAndCopyImages($, introSection, opts);
  const introHtml = sanitizeChapterHtml(introSection.html() ?? "");

  const sections: ChapterSection[] = opts.nav.sections.map((navSection) => {
    const sectionEl = chapterRoot
      .find(`> section[aria-labelledby="${navSection.anchorId}"]`)
      .first();
    if (sectionEl.length === 0) {
      throw new Error(
        `Section anchor ${navSection.anchorId} ("${navSection.title}") from navigation.xhtml not found in ${opts.chapterXhtmlPath}`
      );
    }

    const isReviewQuestions = /^review questions$/i.test(navSection.title);

    if (isReviewQuestions) {
      return {
        anchorId: navSection.anchorId,
        title: navSection.title,
        order: navSection.order,
        isReviewQuestions: true,
        html: `<h2 id="${navSection.anchorId}">${navSection.title}</h2><p>Test your knowledge of this chapter in the Practice Quizzes tab.</p>`,
      };
    }

    stripEmptyBookmarkSpans($, sectionEl);
    rewriteAndCopyImages($, sectionEl, opts);
    return {
      anchorId: navSection.anchorId,
      title: navSection.title,
      order: navSection.order,
      isReviewQuestions: false,
      html: sanitizeChapterHtml(sectionEl.html() ?? ""),
    };
  });

  return {
    slug: opts.nav.slug,
    number: opts.nav.number,
    title: opts.nav.title,
    introHtml,
    sections,
  };
}
