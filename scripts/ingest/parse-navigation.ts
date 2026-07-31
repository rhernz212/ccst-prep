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
 * Parses navigation.xhtml's TOC into the authoritative chapter/section
 * order and titles. Only entries linking to cNN.xhtml are treated as
 * chapters (cover/front-matter/appendix/eula entries are skipped).
 */
export function parseNavigation(navigationPath: string): NavChapter[] {
  const xml = readFileSync(navigationPath, "utf-8");
  const $ = cheerio.load(xml, { xmlMode: true });

  const chapters: NavChapter[] = [];

  $("li.contentsH1").each((_, el) => {
    const $li = $(el);
    const $topAnchor = $li.children("a").first();
    const href = $topAnchor.attr("href") ?? "";
    const match = href.match(/^c(\d\d)\.xhtml$/);
    if (!match) return;

    const number = parseInt(match[1], 10);
    const rawTitle = $topAnchor.text().trim();
    const titleMatch = rawTitle.match(/^Chapter\s+\d+:\s*(.+)$/i);
    const title = titleMatch ? titleMatch[1].trim() : rawTitle;
    const slug = slugify(title);

    const sections: NavSection[] = [];
    $li
      .find("> ol > li.contentsH2 > a")
      .each((i, secEl) => {
        const $a = $(secEl);
        const secHref = $a.attr("href") ?? "";
        const anchorId = secHref.split("#")[1] ?? "";
        if (!anchorId) return;
        sections.push({
          anchorId,
          title: $a.text().trim(),
          order: i,
        });
      });

    chapters.push({ number, slug, title, sourceFile: href, sections });
  });

  chapters.sort((a, b) => a.number - b.number);
  return chapters;
}
