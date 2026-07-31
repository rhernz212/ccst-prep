"use client";

import { useEffect, useRef, useState } from "react";

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

  return (
    <div className={`font-mono text-lg font-semibold ${isLow ? "text-red-600" : "text-gray-900"}`}>
      {minutes}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
