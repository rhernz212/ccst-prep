import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { parseNavigation } from "./parse-navigation";
import { parseChapter } from "./parse-chapter";
import { parseReviewQuestions } from "./parse-review-questions";
import { parseAnswers } from "./parse-answers";
import { parseBlueprint } from "./parse-blueprint";
import type { QuestionBankEntry } from "@/lib/content/types";

const EXAM_SLUG = "ccst-networking";
// f06.xhtml ("Introduction")'s Exam Objectives section — specific to this
// book's front-matter structure, not derivable from navigation.xhtml the
// way chapter anchors are (front-matter entries aren't chapter links).
const EXAM_OBJECTIVES_ANCHOR = "head-2-111";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const arg = args.find((a) => a.startsWith(`--${flag}=`));
    return arg ? arg.split("=")[1] : undefined;
  };
  return {
    source: get("source") ?? "C:/Users/ruben/OneDrive - Neat/Desktop/Books/CCST/OPS",
    only: get("only") ? parseInt(get("only")!, 10) : undefined,
  };
}

async function main() {
  const { source, only } = parseArgs();
  const repoRoot = path.resolve(__dirname, "..", "..");

  const navigationPath = path.join(source, "navigation.xhtml");
  const sourceImagesDir = path.join(source, "images");
  const examDir = path.join(repoRoot, "content", "exams", EXAM_SLUG);
  const contentOutDir = path.join(examDir, "chapters");
  const publicImagesDir = path.join(repoRoot, "public", "content", EXAM_SLUG, "images");
  const publicImagePathPrefix = `/content/${EXAM_SLUG}/images`;

  console.log(`Parsing navigation from ${navigationPath}`);
  const navChapters = parseNavigation(navigationPath);
  console.log(`Found ${navChapters.length} chapters in navigation.xhtml`);

  mkdirSync(contentOutDir, { recursive: true });
  mkdirSync(publicImagesDir, { recursive: true });

  const chaptersToProcess = only
    ? navChapters.filter((c) => c.number === only)
    : navChapters;

  if (only && chaptersToProcess.length === 0) {
    throw new Error(`--only=${only} matched no chapter in navigation.xhtml`);
  }

  console.log("\nParsing the Answers to Review Questions appendix (b01.xhtml)...");
  const answersByChapter = parseAnswers(path.join(source, "b01.xhtml"));

  console.log("Parsing the Exam Objectives blueprint (f06.xhtml)...");
  const blueprint = parseBlueprint(path.join(source, "f06.xhtml"), EXAM_OBJECTIVES_ANCHOR);

  // chapterNumber -> unique domain code, only when exactly one domain's
  // objectives reference that chapter. Chapters referenced by multiple
  // domains are left unassigned (domainCode: null) rather than guessed.
  const domainByChapter = new Map<number, string>();
  {
    const chapterToDomains = new Map<number, Set<string>>();
    for (const domain of blueprint.domains) {
      for (const objective of domain.objectives) {
        for (const chapterNumber of objective.chapterRefs) {
          if (!chapterToDomains.has(chapterNumber)) chapterToDomains.set(chapterNumber, new Set());
          chapterToDomains.get(chapterNumber)!.add(domain.code);
        }
      }
    }
    for (const [chapterNumber, domainCodes] of chapterToDomains) {
      if (domainCodes.size === 1) {
        domainByChapter.set(chapterNumber, [...domainCodes][0]);
      } else {
        console.log(
          `  Chapter ${chapterNumber} is covered by ${domainCodes.size} domains (${[...domainCodes].join(", ")}) — leaving its questions' domainCode unassigned`
        );
      }
    }
  }

  const allQuestions: QuestionBankEntry[] = [];

  for (const nav of chaptersToProcess) {
    const chapterXhtmlPath = path.join(source, nav.sourceFile);
    console.log(`\nParsing chapter ${nav.number}: ${nav.title} (${nav.sourceFile})`);

    const chapter = await parseChapter({
      chapterXhtmlPath,
      nav,
      sourceImagesDir,
      publicImagesDir,
      publicImagePathPrefix,
    });

    const outFile = path.join(contentOutDir, `${nav.sourceFile.replace(".xhtml", "")}.json`);
    writeFileSync(outFile, JSON.stringify(chapter, null, 2), "utf-8");
    console.log(`  -> wrote ${path.relative(repoRoot, outFile)} (${chapter.sections.length} sections)`);

    const reviewSection = nav.sections.find((s) => /^review questions$/i.test(s.title));
    if (!reviewSection) {
      throw new Error(`Chapter ${nav.number} has no "Review Questions" section in navigation.xhtml`);
    }

    const rawQuestions = await parseReviewQuestions(chapterXhtmlPath, reviewSection.anchorId, {
      sourceImagesDir,
      publicImagesDir,
      publicImagePathPrefix,
    });
    const answers = answersByChapter.get(nav.number) ?? [];

    if (rawQuestions.length !== answers.length) {
      throw new Error(
        `Chapter ${nav.number}: ${rawQuestions.length} review questions but ${answers.length} answers in the appendix — expected equal counts (ordinal-correlated)`
      );
    }

    let skipped = 0;
    const domainCode = domainByChapter.get(nav.number) ?? null;

    for (let i = 0; i < rawQuestions.length; i++) {
      const q = rawQuestions[i];
      const a = answers[i];

      if (q.choices.length === 0 || a.correctLabels.length === 0) {
        skipped++;
        continue;
      }

      allQuestions.push({
        chapterNumber: nav.number,
        ordinal: q.ordinal,
        domainCode,
        stem: q.stem,
        explanation: a.explanation,
        isMultiSelect: a.correctLabels.length > 1,
        choices: q.choices.map((c) => ({
          label: c.label,
          body: c.body,
          isCorrect: a.correctLabels.includes(c.label),
        })),
      });
    }

    console.log(
      `  -> ${rawQuestions.length - skipped} multiple-choice questions parsed${skipped ? `, ${skipped} skipped (non-lettered/fill-in-blank)` : ""}`
    );
  }

  if (!only) {
    const questionsOutFile = path.join(examDir, "questions.json");
    writeFileSync(questionsOutFile, JSON.stringify(allQuestions, null, 2), "utf-8");
    console.log(`\nWrote ${path.relative(repoRoot, questionsOutFile)} (${allQuestions.length} questions total)`);

    const blueprintOutFile = path.join(examDir, "blueprint.json");
    writeFileSync(blueprintOutFile, JSON.stringify(blueprint, null, 2), "utf-8");
    console.log(`Wrote ${path.relative(repoRoot, blueprintOutFile)}`);
  } else {
    console.log(`\n--only=${only} set: skipped writing combined questions.json/blueprint.json`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
