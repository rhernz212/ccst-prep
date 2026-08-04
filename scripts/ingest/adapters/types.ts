import type { Blueprint, Chapter, NavChapter } from "@/lib/content/types";
import type { ImagePaths } from "../rewrite-images";

export interface ParsedChoice {
  label: string;
  body: string;
}

export interface ParsedReviewQuestion {
  /** 1-based position within this chapter's review questions — the
   * correlation key against the answers for the same chapter, since books
   * generally use unrelated id schemes on the two sides. */
  ordinal: number;
  stem: string;
  choices: ParsedChoice[];
}

export interface ParsedAnswer {
  ordinal: number;
  /** Usually one letter; two for "choose two" questions (e.g. ["A","D"]). Empty for non-lettered (fill-in-blank) answers. */
  correctLabels: string[];
  explanation: string;
}

/** Everything an adapter needs to parse a single chapter. */
export interface ChapterContext extends ImagePaths {
  /** Absolute path to this chapter's source file. */
  chapterXhtmlPath: string;
  nav: NavChapter;
}

/**
 * The publisher-specific half of ingestion.
 *
 * `ingest.ts` owns everything that holds regardless of who printed the book:
 * walking chapters in navigation order, writing one JSON file per chapter,
 * pairing review questions with their answers by ordinal, and deriving each
 * chapter's blueprint domain. Everything below is markup-shaped and differs
 * per publisher — Sybex nests each section in its own `<section>` element,
 * McGraw-Hill emits a flat run of headings, and the two disagree about where
 * answers and the objective map even live.
 *
 * Adding a book means implementing this interface and registering it in
 * registry.ts, not editing the orchestrator.
 */
export interface BookAdapter {
  /** Publisher/series id. Appears in log output and error messages. */
  id: string;
  /** Used when --source isn't passed. */
  defaultSource: string;
  /** The folder holding image files, given the source root. Not every epub
   *  uses an `images/` subdirectory — some scatter them beside the XHTML. */
  imagesDir(source: string): string;
  /** Basename (without extension) for a chapter's output JSON. */
  chapterOutputName(nav: NavChapter): string;

  /** The table of contents, as the authoritative chapter/section order. */
  parseNavigation(source: string): NavChapter[];
  parseChapter(ctx: ChapterContext): Promise<Chapter>;
  parseReviewQuestions(ctx: ChapterContext): Promise<ParsedReviewQuestion[]>;

  /**
   * chapterNumber -> that chapter's answers, in question order.
   *
   * Loaded in one call rather than per chapter because books split this two
   * ways: Sybex collects every answer into a single appendix file, while
   * McGraw-Hill puts each chapter's answers at the end of that chapter. A
   * whole-book call covers both without the orchestrator caring which.
   */
  loadAnswers(source: string, navChapters: NavChapter[]): Promise<Map<number, ParsedAnswer[]>>;

  /**
   * The exam blueprint, with each objective's `chapterRefs` populated — the
   * orchestrator derives per-chapter domain assignment from those refs, so
   * an adapter is free to source them from an objective-map table, from the
   * objective codes printed at each chapter opening, or from a hand-written
   * file when the epub omits the map entirely.
   */
  parseBlueprint(source: string, navChapters: NavChapter[]): Promise<Blueprint>;
}
