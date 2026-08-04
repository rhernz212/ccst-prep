import type * as cheerio from "cheerio";
import type { Element } from "domhandler";

export interface ChapterSlices {
  /** Everything before the first section anchor: the chapter opening block
   *  (number, title, exam objectives) and any lead-in paragraphs. */
  opening: Element[];
  /** anchorId -> the heading element plus every sibling up to the next anchor. */
  byAnchor: Map<string, Element[]>;
}

/**
 * Splits a chapter into sections.
 *
 * Sybex wraps each section in its own `<section aria-labelledby>`, so a
 * section is one element you can select and lift. McGraw-Hill emits a single
 * flat `<section epub:type="chapter">` holding a run of ~380 sibling
 * elements, where a section is only implied by an `<h3 id="levN">` heading
 * and ends wherever the next one begins. There is nothing to select, so
 * sections are recovered by slicing the sibling stream between anchors.
 *
 * Anchors are matched against direct children only — that's where the
 * headings live, and it avoids a stray matching id deeper in the tree
 * (figure anchors, question back-references) silently redefining a boundary.
 */
export function sliceChapter(
  $: cheerio.CheerioAPI,
  root: ReturnType<cheerio.CheerioAPI>,
  anchorIds: string[],
  chapterPath: string
): ChapterSlices {
  const children = root.children().toArray();

  const indexById = new Map<string, number>();
  children.forEach((el, i) => {
    const id = $(el).attr("id");
    if (id !== undefined && !indexById.has(id)) indexById.set(id, i);
  });

  const anchors = anchorIds.map((anchorId) => {
    const index = indexById.get(anchorId);
    if (index === undefined) {
      throw new Error(
        `Section anchor ${anchorId} from nav.xhtml is not a top-level element in ${chapterPath}`
      );
    }
    return { anchorId, index };
  });

  // Boundaries come from document order, which the TOC is not obliged to
  // match; sorting means a section always ends at whichever anchor physically
  // follows it.
  const ordered = [...anchors].sort((a, b) => a.index - b.index);

  const byAnchor = new Map<string, Element[]>();
  ordered.forEach((anchor, i) => {
    const end = i + 1 < ordered.length ? ordered[i + 1].index : children.length;
    byAnchor.set(anchor.anchorId, children.slice(anchor.index, end));
  });

  const firstAnchorIndex = ordered.length > 0 ? ordered[0].index : children.length;

  return { opening: children.slice(0, firstAnchorIndex), byAnchor };
}

/** Serializes a run of sibling elements back to an HTML string. */
export function renderElements($: cheerio.CheerioAPI, elements: Element[]): string {
  return elements.map((el) => $.html(el)).join("");
}
