import path from "path";
import type { BookAdapter, ParsedAnswer } from "../types";
import { parseNavigation } from "./parse-navigation";
import { parseChapter } from "./parse-chapter";
import { parseReviewQuestions } from "./parse-review-questions";
import { parseAnswers } from "./parse-answers";
import { parseBlueprint } from "./parse-blueprint";

export interface SybexBookConfig {
  defaultSource: string;
  /** Appendix file holding "Answers to Review Questions" for every chapter. */
  answersFile: string;
  /** Front-matter file holding the exam objectives table. */
  blueprintFile: string;
  /**
   * Anchor of the objectives section within blueprintFile. Specific to a
   * book's front matter and not derivable from navigation.xhtml the way
   * chapter anchors are — front-matter entries aren't chapter links.
   */
  blueprintAnchor: string;
  /** Recorded in blueprint.json to document how weights were arrived at. */
  weightingMethod: string;
}

/**
 * Sybex/Wiley study guides: `navigation.xhtml` TOC, one `cNN.xhtml` per
 * chapter with every section wrapped in its own `<section aria-labelledby>`,
 * and all review-question answers collected into a single appendix.
 *
 * Only the file names and the objectives anchor vary between books in this
 * series, so those are configuration rather than a second adapter.
 */
export function createSybexAdapter(config: SybexBookConfig): BookAdapter {
  return {
    id: "sybex",
    defaultSource: config.defaultSource,

    imagesDir: (source) => path.join(source, "images"),

    // Chapter JSON is named after its source file (c01.xhtml -> c01.json).
    chapterOutputName: (nav) => nav.sourceFile.replace(".xhtml", ""),

    parseNavigation: (source) => parseNavigation(path.join(source, "navigation.xhtml")),

    parseChapter,

    parseReviewQuestions: (ctx) => {
      const reviewSection = ctx.nav.sections.find((s) => /^review questions$/i.test(s.title));
      if (!reviewSection) {
        throw new Error(
          `Chapter ${ctx.nav.number} has no "Review Questions" section in navigation.xhtml`
        );
      }
      return parseReviewQuestions(ctx.chapterXhtmlPath, reviewSection.anchorId, ctx);
    },

    // Both of these ignore navChapters: this series keeps answers in one
    // appendix and the objective map in front matter, so neither needs the
    // chapter list to find its source.
    loadAnswers: async (source: string) => {
      const answersPath = path.join(source, config.answersFile);
      console.log(`Parsing the Answers to Review Questions appendix (${config.answersFile})...`);
      return parseAnswers(answersPath) as Map<number, ParsedAnswer[]>;
    },

    parseBlueprint: async (source: string) => {
      console.log(`Parsing the Exam Objectives blueprint (${config.blueprintFile})...`);
      return parseBlueprint(
        path.join(source, config.blueprintFile),
        config.blueprintAnchor,
        config.weightingMethod
      );
    },
  };
}
