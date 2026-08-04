import type { BookAdapter } from "./types";
import { createSybexAdapter } from "./sybex";
import { createMcGrawHillAdapter } from "./mcgraw-hill";

/**
 * Exam slug -> the adapter that can read its source book. The slug is also
 * the folder name under content/exams/, so registering here is what makes
 * `npm run ingest -- --exam=<slug>` work.
 */
const ADAPTERS: Record<string, BookAdapter> = {
  "ccst-networking": createSybexAdapter({
    defaultSource: "C:/Users/ruben/OneDrive - Neat/Desktop/Books/CCST/OPS",
    answersFile: "b01.xhtml",
    blueprintFile: "f06.xhtml",
    blueprintAnchor: "head-2-111",
    weightingMethod:
      "equal-per-objective-count — Cisco publishes no official per-domain scoring weight for this exam as of ingestion time",
  }),

  "comptia-network-plus": createMcGrawHillAdapter({
    defaultSource: "C:/Users/ruben/OneDrive - Neat/Desktop/Books/Network+/OEBPS",
    // CompTIA's published N10-008 domain weights. The book's own objective
    // map appendix is an empty stub, so these are transcribed rather than
    // parsed — parse-blueprint.ts asserts they sum to 1 and that every
    // domain is actually referenced by a chapter.
    domains: [
      { code: "1", title: "Networking Fundamentals", weight: 0.24 },
      { code: "2", title: "Network Implementations", weight: 0.19 },
      { code: "3", title: "Network Operations", weight: 0.16 },
      { code: "4", title: "Network Security", weight: 0.19 },
      { code: "5", title: "Network Troubleshooting", weight: 0.22 },
    ],
    weightingMethod:
      "comptia-published-domain-weights (N10-008) — transcribed from CompTIA's exam objectives at ingestion time, not parsed from the book",
  }),
};

export function getAdapter(examSlug: string): BookAdapter {
  const adapter = ADAPTERS[examSlug];
  if (!adapter) {
    throw new Error(
      `No ingest adapter registered for exam "${examSlug}". Known exams: ${Object.keys(ADAPTERS).join(", ")}`
    );
  }
  return adapter;
}

export function listAdapterSlugs(): string[] {
  return Object.keys(ADAPTERS);
}
