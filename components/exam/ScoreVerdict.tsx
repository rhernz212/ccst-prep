import { Badge } from "@/components/ui/Badge";

export const DEFAULT_TARGET_SCORE = 0.8;

export function meetsTarget(score: number, targetScore = DEFAULT_TARGET_SCORE): boolean {
  return score >= targetScore;
}

/**
 * Labels a practice score against the exam's readiness target. Worded as a
 * study goal rather than pass/fail, because Cisco doesn't publish a cut
 * score for the CCST exams — see ExamMeta.targetScore.
 */
export function ScoreVerdict({
  score,
  targetScore = DEFAULT_TARGET_SCORE,
  showTarget = true,
}: {
  score: number;
  targetScore?: number;
  showTarget?: boolean;
}) {
  const onTarget = meetsTarget(score, targetScore);

  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant={onTarget ? "success" : "neutral"}>
        {onTarget ? "On target" : "Keep practicing"}
      </Badge>
      {showTarget && (
        <span className="text-xs text-muted-foreground">
          target {Math.round(targetScore * 100)}%
        </span>
      )}
    </span>
  );
}
