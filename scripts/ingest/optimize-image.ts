import sharp from "sharp";
import { mkdirSync } from "fs";
import path from "path";

/**
 * The source book's images are 24-bit PNGs straight out of the epub, often
 * several megabytes each for what renders at ~700px (one chapter page was
 * shipping 133 MB of them). Re-encoding to WebP at a sane display width
 * cuts that by ~99% with no visible quality loss on line-art diagrams.
 */
export const MAX_IMAGE_WIDTH = 1400;
export const WEBP_QUALITY = 80;

export interface OptimizedImage {
  /** Output basename, e.g. "c08f001.webp". */
  fileName: string;
  /** Intrinsic dimensions of the *output*, so callers can emit width/height. */
  width: number;
  height: number;
}

export function toWebpFileName(sourceFileName: string): string {
  return `${path.basename(sourceFileName).replace(/\.[^.]+$/, "")}.webp`;
}

/**
 * Re-encodes one image into `destDir` as WebP, downscaling to
 * MAX_IMAGE_WIDTH (never upscaling). Returns the output's intrinsic size.
 */
export async function optimizeImage(sourcePath: string, destDir: string): Promise<OptimizedImage> {
  const fileName = toWebpFileName(sourcePath);
  mkdirSync(destDir, { recursive: true });

  const info = await sharp(sourcePath)
    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(path.join(destDir, fileName));

  return { fileName, width: info.width, height: info.height };
}

/** Reads an already-optimized file's dimensions, for idempotent re-runs. */
export async function readImageSize(filePath: string): Promise<{ width: number; height: number }> {
  const { width, height } = await sharp(filePath).metadata();
  if (!width || !height) {
    throw new Error(`Could not read image dimensions from ${filePath}`);
  }
  return { width, height };
}

/**
 * The attribute set every rendered `<img>` should carry. width/height give
 * the browser an aspect ratio up front (no layout shift as images arrive),
 * and lazy/async keep a 50-image chapter from blocking on all of them.
 *
 * Note: these attributes only survive ingestion if sanitize.ts allows them
 * on `img` — see its allowedAttributes.
 */
export function imageAttrs(
  image: OptimizedImage,
  publicImagePathPrefix: string
): Record<string, string> {
  return {
    src: `${publicImagePathPrefix}/${image.fileName}`,
    width: String(image.width),
    height: String(image.height),
    loading: "lazy",
    decoding: "async",
  };
}
