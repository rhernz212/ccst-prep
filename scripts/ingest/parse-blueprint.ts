import * as cheerio from "cheerio";
import { readFileSync } from "fs";
import type { Blueprint, BlueprintDomain, BlueprintObjective } from "@/lib/content/types";

function extractChapterRefs(
  $row: ReturnType<cheerio.CheerioAPI>,
  $: cheerio.CheerioAPI
): number[] {
  const refs: number[] = [];
  $row
    .find("td")
    .eq(1)
    .find("a")
    .each((_, a) => {
      const href = $(a).attr("href") ?? "";
      const match = href.match(/^c(\d+)\.xhtml/);
      if (match) refs.push(parseInt(match[1], 10));
    });
  return refs;
}

/**
 * Parses the Introduction's "Exam Objectives" table into a domain/objective
 * tree. Cisco does not publish official per-domain scoring weights for this
 * exam, so weight is a heuristic (equal share per objective count) — see
 * weightingMethod, which is carried into the output so it stays
 * discoverable rather than silently baked in.
 */
export function parseBlueprint(introXhtmlPath: string, sectionAnchorId: string): Blueprint {
  const xml = readFileSync(introXhtmlPath, "utf-8");
  const $ = cheerio.load(xml, { xmlMode: true });

  const section = $(`body section[aria-labelledby="${sectionAnchorId}"]`).first();
  if (section.length === 0) {
    throw new Error(`Exam Objectives section ${sectionAnchorId} not found in ${introXhtmlPath}`);
  }
  const rows = section.find("table tbody tr");

  const domains: BlueprintDomain[] = [];
  let currentDomain: BlueprintDomain | null = null;
  let currentObjective: BlueprintObjective | null = null;

  rows.each((_, rowEl) => {
    const $row = $(rowEl);
    const firstCell = $row.find("td").eq(0);
    const boldText = firstCell.find("> b").first().text().trim();

    if (boldText) {
      const objectiveMatch = boldText.match(/^(\d+\.\d+)\.\s+(.+)$/);
      const domainMatch = boldText.match(/^(\d+)\.\s+(.+)$/);

      if (objectiveMatch) {
        currentObjective = {
          code: objectiveMatch[1],
          title: objectiveMatch[2].trim(),
          chapterRefs: extractChapterRefs($row, $),
          contentExamples: [],
        };
        currentDomain?.objectives.push(currentObjective);
      } else if (domainMatch) {
        currentDomain = {
          code: domainMatch[1],
          title: domainMatch[2].trim(),
          objectives: [],
          weight: 0,
        };
        currentObjective = null;
        domains.push(currentDomain);
      }
    } else if (currentObjective) {
      const items: string[] = [];
      firstCell.find("li").each((_, li) => {
        items.push($(li).text().trim());
      });
      currentObjective.contentExamples.push(...items);
    }
  });

  const totalObjectives = domains.reduce((sum, d) => sum + d.objectives.length, 0);
  for (const domain of domains) {
    domain.weight = totalObjectives > 0 ? domain.objectives.length / totalObjectives : 0;
  }

  return {
    weightingMethod:
      "equal-per-objective-count — Cisco publishes no official per-domain scoring weight for this exam as of ingestion time",
    domains,
  };
}
