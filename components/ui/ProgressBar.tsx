"use client";

import { useEffect, useState } from "react";

export function ProgressBar({
  value,
  colorClassName = "bg-brand-600",
}: {
  value: number;
  colorClassName?: string;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
      <div
        className={`h-2 rounded-full transition-[width] duration-700 ease-out ${colorClassName}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
