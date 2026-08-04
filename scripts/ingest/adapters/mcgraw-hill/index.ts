import path from "path";
import type { NavChapter } from "@/lib/content/types";
import type { BookAdapter, ParsedAnswer } from "../types";
import { parseNavigation } from "./parse-navigation";
import { parseChapter } from "./parse-chapter";
import { parseReviewQuestions, parseAnswers } from "./parse-questions";
import { parseBlueprint, type DomainWeight } from "./parse-blueprint";

export interface McGrawHillBookConfig {
  defaultSource: string;
  /**
   * Domain titles and per-domain exam weights. Not present anywhere in the
   * EPUB — this series ships an empty "Exam Objective Map" stub and keeps
   * the real table in its online content — so these are transcribed from the
   * vendor's published exam objectives and validated at ingest time (they
   * must sum to 1, and every domain must be referenced by some chapter).
   */
  domains: DomainWeight[];
  /** Recorded in blueprint.json to document where the weights came from. */
  weightingMethod: string;
}

/**
 * McGraw-Hill "All-in-One Exam Guide" titles: `nav.xhtml` TOC, one
 * `chN.xhtml` per chapter, and — unlike Sybex — a completely flat chapter
 * body where sections are implied by heading anchors rather than wrapped in
 * their own elements (see slice.ts). Review questions and their answers are
 * printed at the end of each chapter instead of collected into an appendix.
 */
export function createMcGrawHillAdapter(config: McGrawHillBookConfig): BookAdapter {
  return {
    id: "mcgraw-hill",
    defaultSource: config.defaultSource,

    // This series keeps images beside the XHTML rather than in a subfolder.
    imagesDir: (source) => source,

    // ch1.xhtml -> c01.json, so chapters sort lexically in the content dir
    // the way they do for every other exam.
    chapterOutputName: (nav) => `c${String(nav.number).padStart(2, "0")}`,

    parseNavigation: (source) => parseNavigation(path.join(source, "nav.xhtml")),

    parseChapter,

    parseReviewQuestions: (ctx) => parseReviewQuestions(ctx.chapterXhtmlPath, ctx),

    loadAnswers: async (source: string, navChapters: NavChapter[]) => {
      console.log("Parsing per-chapter answer keys...");
      const byChapter = new Map<number, ParsedAnswer[]>();
      for (const nav of navChapters) {
        byChapter.set(nav.number, parseAnswers(path.join(source, nav.sourceFile)));
      }
      return byChapter;
    },

    parseBlueprint: async (source: string, navChapters: NavChapter[]) => {
      console.log("Deriving the blueprint from chapter-opening objective codes...");
      return parseBlueprint(source, navChapters, config.domains, config.weightingMethod);
    },
  };
}
