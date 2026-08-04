import type { Chapter } from "@/lib/content/types";

export interface ChapterLinkTarget {
  number: number;
  slug: string;
  /** The chapter's file name in the source epub, e.g. "c01.xhtml" or "ch1.xhtml". */
  sourceFile: string;
}

export interface LinkRewriteStats {
  sameChapter: number;
  crossChapter: number;
  droppedAnchor: number;
  unresolved: number;
}

/** Every `id` the chapter renders, so a link can be checked before it's kept. */
export function collectAnchors(chapter: Chapter): Set<string> {
  const html = chapter.introHtml + chapter.sections.map((s) => s.html).join("");
  return new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
}

/**
 * Repoints the book's own cross-references at site URLs.
 *
 * Epub cross-references are file-relative — `<a href="ch7.xhtml#ch7fig1">Figure
 * 7-1</a>` — and carrying them through ingestion verbatim leaves every one of
 * them 404ing, because the site routes by chapter slug. Publishers differ in
 * how often this bites: Sybex writes same-chapter references as bare `#anchor`
 * and only crosses files occasionally, while McGraw-Hill spells out the file
 * name even when the target is on the same page.
 *
 * Bare `#anchor` links are left alone — they already work.
 *
 * Anchors are verified against the target chapter rather than assumed, because
 * some resolve to elements that ingestion drops (the chapter-title heading, or
 * anything inside the stubbed review-questions section). Those degrade to the
 * chapter page rather than a link that lands nowhere.
 */
export function rewriteChapterLinks(opts: {
  chapters: Chapter[];
  examSlug: string;
  targets: ChapterLinkTarget[];
  anchorsByChapter: Map<number, Set<string>>;
}): LinkRewriteStats {
  const { chapters, examSlug, targets, anchorsByChapter } = opts;

  const byFile = new Map(targets.map((t) => [t.sourceFile.toLowerCase(), t]));
  const stats: LinkRewriteStats = {
    sameChapter: 0,
    crossChapter: 0,
    droppedAnchor: 0,
    unresolved: 0,
  };

  for (const chapter of chapters) {
    const rewrite = (html: string): string =>
      html.replace(/href="([^"]*)"/g, (whole, href: string) => {
        // Already a site-relative anchor, or points off-site.
        if (href.startsWith("#") || /^[a-z]+:/i.test(href)) return whole;

        const [file, anchor = ""] = href.split("#");
        if (!file) return whole;

        const target = byFile.get(file.toLowerCase());
        if (!target) {
          stats.unresolved++;
          return whole;
        }

        const anchorExists = anchor !== "" && (anchorsByChapter.get(target.number)?.has(anchor) ?? false);
        if (anchor !== "" && !anchorExists) stats.droppedAnchor++;

        if (target.number === chapter.number) {
          if (anchorExists) {
            stats.sameChapter++;
            return `href="#${anchor}"`;
          }
          stats.sameChapter++;
          return `href="/exams/${examSlug}/study/${target.slug}"`;
        }

        stats.crossChapter++;
        const suffix = anchorExists ? `#${anchor}` : "";
        return `href="/exams/${examSlug}/study/${target.slug}${suffix}"`;
      });

    chapter.introHtml = rewrite(chapter.introHtml);
    for (const section of chapter.sections) {
      section.html = rewrite(section.html);
    }
  }

  return stats;
}
