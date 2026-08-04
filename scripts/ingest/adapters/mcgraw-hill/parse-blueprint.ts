import path from "path";
import type { Blueprint, BlueprintDomain, BlueprintObjective, NavChapter } from "@/lib/content/types";
import { loadChapterRoot } from "./parse-chapter";

export interface DomainWeight {
  code: string;
  title: string;
  /** Fraction of the exam, 0-1. Must sum to 1 across all domains. */
  weight: number;
}

/**
 * Builds the blueprint from the objective codes printed at each chapter
 * opening.
 *
 * This series ships its "Exam Objective Map" appendix as an empty stub —
 * the real table is part of the publisher's online content, not the EPUB —
 * so there's no objectives table to parse. What the book does carry is a
 * reliable per-chapter list ("The CompTIA Network+ certification exam
 * expects you to know how to 1.1 …"), which is enough to recover which
 * chapters cover which objective. Domain titles and weights aren't in the
 * book at all and are supplied by the caller from the vendor's published
 * objectives.
 */
export function parseBlueprint(
  source: string,
  navChapters: NavChapter[],
  domainWeights: DomainWeight[],
  weightingMethod: string
): Blueprint {
  const objectives = new Map<string, BlueprintObjective>();

  for (const nav of navChapters) {
    const { $, root } = loadChapterRoot(path.join(source, nav.sourceFile));

    // The opening block; everything after it is chapter body.
    root.find("> div.hrc p.bullo").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      // "•   1.1 Compare and contrast the OSI model layers …". The second
      // bullet list in the block ("To achieve these goals, you must be able
      // to …") carries no code and is skipped by this pattern.
      const match = text.match(/^[•\s]*(\d+\.\d+)\s+(.+)$/);
      if (!match) return;

      const [, code, title] = match;
      const existing = objectives.get(code);
      if (existing) {
        if (!existing.chapterRefs.includes(nav.number)) existing.chapterRefs.push(nav.number);
        return;
      }
      objectives.set(code, {
        code,
        title: title.replace(/\s*\.\s*$/, ""),
        chapterRefs: [nav.number],
        // The openings cite objectives by code and statement only; the
        // vendor's bulleted content examples aren't reproduced here.
        contentExamples: [],
      });
    });
  }

  if (objectives.size === 0) {
    throw new Error(
      "No objective codes found at any chapter opening — the blueprint would be empty"
    );
  }

  const domains: BlueprintDomain[] = domainWeights.map((d) => ({
    code: d.code,
    title: d.title,
    weight: d.weight,
    objectives: [],
  }));
  const domainByCode = new Map(domains.map((d) => [d.code, d]));

  for (const objective of [...objectives.values()].sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true })
  )) {
    const domainCode = objective.code.split(".")[0];
    const domain = domainByCode.get(domainCode);
    if (!domain) {
      throw new Error(
        `Chapter openings reference objective ${objective.code}, but no domain "${domainCode}" is configured. Configured domains: ${domainWeights.map((d) => d.code).join(", ")}`
      );
    }
    objective.chapterRefs.sort((a, b) => a - b);
    domain.objectives.push(objective);
  }

  // The weights are transcribed by hand, so verify rather than trust: a
  // typo'd percentage would silently skew practice-exam question selection.
  const totalWeight = domains.reduce((sum, d) => sum + d.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.0001) {
    throw new Error(
      `Configured domain weights sum to ${totalWeight.toFixed(4)}, expected 1.0 — check the transcribed percentages`
    );
  }

  const empty = domains.filter((d) => d.objectives.length === 0);
  if (empty.length > 0) {
    throw new Error(
      `Configured domains have no objectives referenced by any chapter: ${empty.map((d) => `${d.code} (${d.title})`).join(", ")}`
    );
  }

  return { weightingMethod, domains };
}
