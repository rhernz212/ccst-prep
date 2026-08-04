import type { ExamMeta, ExamTool } from "./types";

export const ALL_EXAM_TOOLS: readonly ExamTool[] = ["subnetting", "cli"];

/**
 * Which tool tabs an exam offers. Deliberately importable from both server
 * and client components — it's a pure read of meta.json with no filesystem
 * access, unlike content-reader.ts.
 *
 * Omitting `tools` in meta.json means all of them, so an exam added without
 * thinking about it keeps the previous behaviour.
 */
export function examTools(meta: Pick<ExamMeta, "tools">): readonly ExamTool[] {
  return meta.tools ?? ALL_EXAM_TOOLS;
}

export function hasExamTool(meta: Pick<ExamMeta, "tools">, tool: ExamTool): boolean {
  return examTools(meta).includes(tool);
}
