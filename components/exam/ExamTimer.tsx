"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

export function ExamTimer({
  startedAt,
  timeLimitMinutes,
  onExpire,
}: {
  startedAt: string;
  timeLimitMinutes: number;
  onExpire: () => void;
}) {
  const totalMs = timeLimitMinutes * 60 * 1000;
  // Deterministic initial value (same on server and client) — the actual
  // remaining time depends on Date.now(), which would differ between the
  // server render and client hydration and trigger a mismatch warning.
  // An effect corrects it immediately after mount.
  const [remainingMs, setRemainingMs] = useState(totalMs);
  const expiredRef = useRef(false);

  useEffect(() => {
    const endTime = new Date(startedAt).getTime() + totalMs;

    function tick() {
      const remaining = Math.max(0, endTime - Date.now());
      setRemainingMs(remaining);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, totalMs, onExpire]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isLow = remainingMs < 5 * 60 * 1000;

  // Announcing every tick would be unusable, so only the milestones that
  // change what a candidate does get spoken. The visible readout stays a
  // plain (non-live) node so it can still be read on demand without
  // interrupting once per second.
  const announcement =
    minutes === 5 && seconds === 0
      ? "5 minutes remaining"
      : minutes === 1 && seconds === 0
        ? "1 minute remaining"
        : minutes === 0 && seconds === 0
          ? "Time is up. Submitting your exam."
          : null;

  return (
    <>
      {/* The last five minutes get a tinted chip rather than just red text —
          on a phone, a colour change on two small digits is easy to miss. */}
      <div
        className={`tabular inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-base font-semibold transition-colors duration-500 ${
          isLow
            ? "border-danger-300 bg-danger-50 text-danger-700 dark:border-danger-500/50 dark:bg-danger-500/15 dark:text-danger-300"
            : "border-border bg-surface-hover text-foreground"
        }`}
      >
        <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        <span className="sr-only">Time remaining: </span>
        {minutes}:{String(seconds).padStart(2, "0")}
      </div>
      {/* role="alert" is implicitly assertive — a time warning should cut in. */}
      <div className="sr-only" role="alert">
        {announcement}
      </div>
    </>
  );
}
