import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import path from "path";
import {
  imageAttrs,
  optimizeImage,
  readImageSize,
  toWebpFileName,
  type OptimizedImage,
} from "./optimize-image";

/**
 * Re-encodes the already-ingested content's images to WebP in place and
 * rewrites the committed JSON to match, so you don't need the source epub
 * to pick up the optimization. Idempotent — re-running reuses any .webp
 * that's already there.
 *
 * Future ingests produce this shape directly (see rewrite-images.ts); this
 * script exists to migrate content that was ingested before that.
 *
 *   npm run optimize:images
 *   npm run optimize:images -- --source "<path to extracted epub OPS folder>"
 *
 * `--source` is only consulted for images referenced by the JSON but absent
 * from public/ (four review-question diagrams were in that state, because
 * question stems weren't going through image rewriting at all).
 */

const CONVERT_CONCURRENCY = 8;
const MANAGED_ATTRS = new Set(["src", "width", "height", "loading", "decoding"]);
const IMG_TAG = /<img\b[^>]*>/g;
const ATTR = /([a-zA-Z-]+)="([^"]*)"/g;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const inline = args.find((a) => a.startsWith(`--${flag}=`));
    if (inline) return inline.split("=").slice(1).join("=");
    const i = args.indexOf(`--${flag}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return { exam: get("exam") ?? "ccst-networking", source: get("source") };
}

/** Every string in the JSON tree that could hold an <img>, rewritten in place. */
function mapStrings(value: unknown, fn: (s: string) => string): unknown {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, mapStrings(v, fn)])
    );
  }
  return value;
}

function collectImageRefs(html: string, into: Set<string>) {
  for (const tag of html.match(IMG_TAG) ?? []) {
    const src = /\ssrc="([^"]*)"/.exec(tag)?.[1];
    if (src) into.add(path.basename(src));
  }
}

/**
 * Rebuilds one <img> tag: existing attributes are preserved verbatim (alt
 * text is already HTML-escaped by sanitize-html, so re-emitting the raw
 * captured value avoids a double-escaping round trip), while the managed
 * attributes are replaced wholesale.
 */
function rewriteImgTag(
  tag: string,
  optimizedByOriginal: Map<string, OptimizedImage>,
  publicImagePathPrefix: string
): string {
  const src = /\ssrc="([^"]*)"/.exec(tag)?.[1];
  if (!src) return tag;

  const optimized = optimizedByOriginal.get(path.basename(src));
  if (!optimized) return tag;

  const preserved = [...tag.matchAll(ATTR)]
    .filter(([, name]) => !MANAGED_ATTRS.has(name.toLowerCase()))
    .map(([, name, value]) => `${name}="${value}"`);

  const managed = Object.entries(imageAttrs(optimized, publicImagePathPrefix)).map(
    ([name, value]) => `${name}="${value}"`
  );

  return `<img ${[...preserved, ...managed].join(" ")} />`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    })
  );
  return results;
}

async function main() {
  const { exam, source } = parseArgs();
  const repoRoot = path.resolve(__dirname, "..", "..");
  const examDir = path.join(repoRoot, "content", "exams", exam);
  const publicImagesDir = path.join(repoRoot, "public", "content", exam, "images");
  const publicImagePathPrefix = `/content/${exam}/images`;

  if (!existsSync(examDir)) throw new Error(`No ingested content at ${examDir}`);

  const jsonFiles = [
    ...readdirSync(path.join(examDir, "chapters"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(examDir, "chapters", f)),
    path.join(examDir, "questions.json"),
  ].filter(existsSync);

  // Pass 1 — find every image the content actually references.
  const referenced = new Set<string>();
  const parsed = new Map<string, unknown>();
  for (const file of jsonFiles) {
    const data = JSON.parse(readFileSync(file, "utf-8"));
    parsed.set(file, data);
    mapStrings(data, (s) => {
      collectImageRefs(s, referenced);
      return s;
    });
  }
  console.log(`${referenced.size} unique images referenced across ${jsonFiles.length} JSON files`);

  // Pass 2 — make sure each one exists as an optimized .webp.
  const names = [...referenced].sort();
  let bytesBefore = 0;
  let bytesAfter = 0;
  let converted = 0;
  let reused = 0;
  const missing: string[] = [];

  const entries = await mapWithConcurrency(names, CONVERT_CONCURRENCY, async (name) => {
    const webpName = toWebpFileName(name);
    const webpPath = path.join(publicImagesDir, webpName);

    if (existsSync(webpPath)) {
      reused++;
      const { width, height } = await readImageSize(webpPath);
      bytesAfter += statSync(webpPath).size;
      return [name, { fileName: webpName, width, height }] as const;
    }

    // Prefer the copy already in public/; fall back to the epub for images
    // that never got copied across in the first place.
    const candidates = [
      path.join(publicImagesDir, name),
      ...(source ? [path.join(source, "images", name)] : []),
    ];
    const sourcePath = candidates.find(existsSync);
    if (!sourcePath) {
      missing.push(name);
      return null;
    }

    bytesBefore += statSync(sourcePath).size;
    const optimized = await optimizeImage(sourcePath, publicImagesDir);
    bytesAfter += statSync(path.join(publicImagesDir, optimized.fileName)).size;
    converted++;
    return [name, optimized] as const;
  });

  if (missing.length > 0) {
    console.error(
      `\n${missing.length} referenced image(s) exist in neither public/ nor --source:\n  ${missing.join("\n  ")}`
    );
    if (!source) console.error("\nRe-run with --source \"<extracted epub OPS folder>\" to pull them in.");
    process.exit(1);
  }

  const optimizedByOriginal = new Map(
    entries.filter((e): e is NonNullable<typeof e> => e !== null)
  );

  console.log(
    `Converted ${converted} image(s)${reused ? `, reused ${reused} existing .webp` : ""}: ` +
      `${(bytesBefore / 1048576).toFixed(1)} MB -> ${(bytesAfter / 1048576).toFixed(1)} MB`
  );

  // Pass 3 — rewrite the JSON to point at the optimized files.
  for (const [file, data] of parsed) {
    const updated = mapStrings(data, (s) =>
      s.replace(IMG_TAG, (tag) => rewriteImgTag(tag, optimizedByOriginal, publicImagePathPrefix))
    );
    writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`, "utf-8");
    console.log(`  -> rewrote ${path.relative(repoRoot, file)}`);
  }

  // Pass 4 — drop the superseded originals.
  const leftovers = readdirSync(publicImagesDir).filter((f) => !f.endsWith(".webp"));
  let reclaimed = 0;
  for (const file of leftovers) {
    const full = path.join(publicImagesDir, file);
    reclaimed += statSync(full).size;
    rmSync(full);
  }
  if (leftovers.length > 0) {
    console.log(
      `Removed ${leftovers.length} superseded original(s), reclaiming ${(reclaimed / 1048576).toFixed(1)} MB`
    );
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
