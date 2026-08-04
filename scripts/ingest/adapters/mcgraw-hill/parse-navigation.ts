import * as cheerio from "cheerio";
import { readFileSync } from "fs";
import type { NavChapter, NavSection } from "@/lib/content/types";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Parses nav.xhtml's TOC into the authoritative chapter/section order and
 * titles. Only entries linking to chN.xhtml are treated as chapters, which
 * skips the cover, front matter, appendices, glossary, and index.
 *
 * The nav nests three levels deep (chapter > h3 section > h4 subsection);
 * only the first level under each chapter becomes a NavSection, matching how
 * the study page renders one block per top-level heading.
 */
export function parseNavigation(navigationPath: string): NavChapter[] {
  const xml = readFileSync(navigationPath, "utf-8");
  const $ = cheerio.load(xml, { xmlMode: true });

  const chapters: NavChapter[] = [];

  // nav.xhtml holds three <nav> elements — the TOC, landmarks, and a
  // page-list of ~976 entries. The page-list links into the same chapter
  // files, so selecting on <nav> generally would read page numbers as
  // chapter titles.
  const toc = $("nav")
    .filter((_, el) => $(el).attr("epub:type") === "toc")
    .first();
  if (toc.length === 0) {
    throw new Error(`No <nav epub:type="toc"> found in ${navigationPath}`);
  }

  toc.find("> ol > li").each((_, el) => {
    const $li = $(el);
    const $topAnchor = $li.children("a").first();
    const href = $topAnchor.attr("href") ?? "";
    const match = href.match(/^ch(\d+)\.xhtml/);
    if (!match) return;

    const number = parseInt(match[1], 10);
    const rawTitle = $topAnchor.text().replace(/\s+/g, " ").trim();
    // "Chapter 1 Network Models" — no colon separator in this series.
    const titleMatch = rawTitle.match(/^Chapter\s+\d+\s+(.+)$/i);
    const title = titleMatch ? titleMatch[1].trim() : rawTitle;

    const sections: NavSection[] = [];
    $li.find("> ol > li > a").each((i, secEl) => {
      const $a = $(secEl);
      const anchorId = ($a.attr("href") ?? "").split("#")[1] ?? "";
      if (!anchorId) return;
      sections.push({
        anchorId,
        title: $a.text().replace(/\s+/g, " ").trim(),
        order: i,
      });
    });

    chapters.push({
      number,
      slug: slugify(title),
      title,
      sourceFile: href.split("#")[0],
      sections,
    });
  });

  chapters.sort((a, b) => a.number - b.number);
  return chapters;
}
