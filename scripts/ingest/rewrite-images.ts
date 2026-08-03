import type * as cheerio from "cheerio";
import { existsSync } from "fs";
import path from "path";
import { imageAttrs, optimizeImage } from "./optimize-image";

export interface ImagePaths {
  /** The epub's `images/` folder. */
  sourceImagesDir: string;
  publicImagesDir: string;
  /** e.g. "/content/ccst-networking/images" */
  publicImagePathPrefix: string;
}

/**
 * Rewrites every `<img>` in a cheerio fragment to point at an optimized
 * copy under publicImagesDir, carrying intrinsic dimensions and lazy
 * loading (see optimize-image.ts).
 *
 * Both chapter bodies and review-question stems go through this — question
 * stems used to be parsed without it, which left four of them pointing at
 * the epub-relative `images/foo.png` and 404ing in the browser.
 */
export async function rewriteImages(
  $: cheerio.CheerioAPI,
  root: ReturnType<cheerio.CheerioAPI>,
  paths: ImagePaths
): Promise<void> {
  // Collect first: optimizing is async, and mutating during cheerio's
  // synchronous .each() walk isn't safe to interleave with awaits.
  const images = root.find("img").toArray();

  for (const imgEl of images) {
    const $img = $(imgEl);
    const src = $img.attr("src");
    if (!src) continue;

    const fileName = path.basename(src);
    const sourcePath = path.join(paths.sourceImagesDir, fileName);
    if (!existsSync(sourcePath)) {
      throw new Error(`Image referenced in chapter but missing from source: ${sourcePath}`);
    }

    const optimized = await optimizeImage(sourcePath, paths.publicImagesDir);
    for (const [attr, value] of Object.entries(imageAttrs(optimized, paths.publicImagePathPrefix))) {
      $img.attr(attr, value);
    }
  }
}
