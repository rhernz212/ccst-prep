import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { parseNavigation } from "./parse-navigation";
import { parseChapter } from "./parse-chapter";

const EXAM_SLUG = "ccst-networking";

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

function main() {
  const { source, only } = parseArgs();
  const repoRoot = path.resolve(__dirname, "..", "..");

  const navigationPath = path.join(source, "navigation.xhtml");
  const sourceImagesDir = path.join(source, "images");
  const contentOutDir = path.join(repoRoot, "content", "exams", EXAM_SLUG, "chapters");
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

  for (const nav of chaptersToProcess) {
    const chapterXhtmlPath = path.join(source, nav.sourceFile);
    console.log(`Parsing chapter ${nav.number}: ${nav.title} (${nav.sourceFile})`);

    const chapter = parseChapter({
      chapterXhtmlPath,
      nav,
      sourceImagesDir,
      publicImagesDir,
      publicImagePathPrefix,
    });

    const outFile = path.join(contentOutDir, `${nav.sourceFile.replace(".xhtml", "")}.json`);
    writeFileSync(outFile, JSON.stringify(chapter, null, 2), "utf-8");
    console.log(`  -> wrote ${path.relative(repoRoot, outFile)} (${chapter.sections.length} sections)`);
  }

  console.log("Done.");
}

main();
