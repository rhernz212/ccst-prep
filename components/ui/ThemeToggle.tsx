"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  // Deliberate one-time client-only setState: the root layout's inline
  // no-FOUC script sets the .dark class before React hydrates, so this
  // component's initial render can't know that value without reading the
  // DOM after mount (reading it during render would risk a hydration
  // mismatch, since the server has no way to know it at all).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.theme = next ? "dark" : "light";
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-[background-color,color,border-color,transform] duration-200 ease-[var(--ease-spring)] hover:border-border hover:bg-surface hover:text-foreground active:scale-90"
    >
      {/*
        Both icons are always mounted and cross-faded through a rotation, so
        the switch reads as one object turning rather than two icons swapping.
        The wrapper is a fixed-size grid cell to stop the rotation from
        nudging the header layout.
      */}
      <span className="relative grid h-[18px] w-[18px] place-items-center">
        <Sun
          aria-hidden="true"
          className={`absolute h-[18px] w-[18px] transition-[opacity,transform] duration-300 ease-[var(--ease-spring)] ${
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
          }`}
        />
        <Moon
          aria-hidden="true"
          className={`absolute h-[18px] w-[18px] transition-[opacity,transform] duration-300 ease-[var(--ease-spring)] ${
            isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
      </span>
    </button>
  );
}
