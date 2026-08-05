export interface SearchHit {
  chapterNumber: number;
  chapterSlug: string;
  chapterTitle: string;
  sectionTitle: string;
  /** The section's in-page anchor, so a hit links to the passage itself. */
  anchorId: string;
  /**
   * A one-fragment excerpt with matches wrapped in [[HL]]…[[/HL]].
   *
   * Plain-text markers rather than HTML: the excerpt is book prose, and book
   * prose contains things like `a < b`. Handing that to dangerouslySetInnerHTML
   * to get bold matches would mean re-parsing content as markup at the very
   * last step, so the client splits on the markers instead.
   */
  snippet: string;
}

export const HIGHLIGHT_START = "[[HL]]";
export const HIGHLIGHT_END = "[[/HL]]";
