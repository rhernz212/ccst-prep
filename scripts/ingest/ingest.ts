import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { getAdapter, listAdapterSlugs } from "./adapters/registry";
import { collectAnchors, rewriteChapterLinks } from "./rewrite-links";
import type { Chapter, QuestionBankEntry } from "@/lib/content/types";

/**
 * Publisher-agnostic ingestion: walks a book's chapters in navigation order,
 * writes one JSON file per chapter under content/exams/<slug>/chapters/, and
 * pairs each chapter's review questions with its answers into a single
 * questions.json.
 *
 * Everything markup-shaped lives behind a BookAdapter (see adapters/types.ts)
 * — adding a certification means registering an adapter, not editing this
 * file.
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const arg = args.find((a) => a.startsWith(`--${flag}=`));
    return arg ? arg.split("=")[1] : undefined;
  };
  const exam = get("exam");
  if (!exam) {
    throw new Error(
      `--exam=<slug> is required. Known exams: ${listAdapterSlugs().join(", ")}`
    );
  }
  return {
    exam,
    source: get("source"),
    only: get("only") ? parseInt(get("only")!, 10) : undefined,
  };
}

async function main() {
  const { exam: examSlug, source: sourceArg, only } = parseArgs();
  const adapter = getAdapter(examSlug);
  const source = sourceArg ?? adapter.defaultSource;
  const repoRoot = path.resolve(__dirname, "..", "..");

  const sourceImagesDir = adapter.imagesDir(source);
  const examDir = path.join(repoRoot, "content", "exams", examSlug);
  const contentOutDir = path.join(examDir, "chapters");
  const publicImagesDir = path.join(repoRoot, "public", "content", examSlug, "images");
  const publicImagePathPrefix = `/content/${examSlug}/images`;

  console.log(`Ingesting ${examSlug} with the "${adapter.id}" adapter`);
  console.log(`Parsing navigation from ${source}`);
  const navChapters = adapter.parseNavigation(source);
  console.log(`Found ${navChapters.length} chapters in navigation`);

  mkdirSync(contentOutDir, { recursive: true });
  mkdirSync(publicImagesDir, { recursive: true });

  const chaptersToProcess = only
    ? navChapters.filter((c) => c.number === only)
    : navChapters;

  if (only && chaptersToProcess.length === 0) {
    throw new Error(`--only=${only} matched no chapter in the book's navigation`);
  }

  console.log("");
  const answersByChapter = await adapter.loadAnswers(source, navChapters);
  const blueprint = await adapter.parseBlueprint(source, navChapters);

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
  // Chapters are held until every one has been parsed: cross-reference
  // rewriting needs to know which anchors actually exist book-wide before any
  // file is written.
  const parsedChapters: Array<{ outFile: string; chapter: Chapter }> = [];

  for (const nav of chaptersToProcess) {
    const chapterXhtmlPath = path.join(source, nav.sourceFile);
    console.log(`\nParsing chapter ${nav.number}: ${nav.title} (${nav.sourceFile})`);

    const ctx = {
      chapterXhtmlPath,
      nav,
      sourceImagesDir,
      publicImagesDir,
      publicImagePathPrefix,
    };

    const chapter = await adapter.parseChapter(ctx);

    const outFile = path.join(contentOutDir, `${adapter.chapterOutputName(nav)}.json`);
    parsedChapters.push({ outFile, chapter });
    console.log(`  -> ${chapter.sections.length} sections`);

    const rawQuestions = await adapter.parseReviewQuestions(ctx);
    const answers = answersByChapter.get(nav.number) ?? [];

    if (rawQuestions.length !== answers.length) {
      throw new Error(
        `Chapter ${nav.number}: ${rawQuestions.length} review questions but ${answers.length} answers — expected equal counts (ordinal-correlated)`
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

  // Anchors come from this run's chapters, topped up from already-committed
  // JSON for any chapter it skipped, so `--only` still resolves references
  // into the rest of the book instead of flattening them to chapter links.
  const anchorsByChapter = new Map<number, Set<string>>();
  for (const { chapter } of parsedChapters) {
    anchorsByChapter.set(chapter.number, collectAnchors(chapter));
  }
  for (const nav of navChapters) {
    if (anchorsByChapter.has(nav.number)) continue;
    const existing = path.join(contentOutDir, `${adapter.chapterOutputName(nav)}.json`);
    if (!existsSync(existing)) continue;
    anchorsByChapter.set(
      nav.number,
      collectAnchors(JSON.parse(readFileSync(existing, "utf-8")) as Chapter)
    );
  }

  const linkStats = rewriteChapterLinks({
    chapters: parsedChapters.map((p) => p.chapter),
    examSlug,
    targets: navChapters,
    anchorsByChapter,
  });
  console.log(
    `\nRewrote cross-references: ${linkStats.sameChapter} same-chapter, ${linkStats.crossChapter} cross-chapter` +
      (linkStats.droppedAnchor ? `, ${linkStats.droppedAnchor} anchors dropped (target not rendered)` : "") +
      (linkStats.unresolved ? `, ${linkStats.unresolved} left alone (no matching chapter)` : "")
  );

  for (const { outFile, chapter } of parsedChapters) {
    writeFileSync(outFile, JSON.stringify(chapter, null, 2), "utf-8");
    console.log(`  -> wrote ${path.relative(repoRoot, outFile)}`);
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
