"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { runCommand } from "@/lib/domain/cli-sim/interpreter";
import { DEFAULT_NETWORK_STATE } from "@/lib/domain/cli-sim/networkState";

interface TerminalEntry {
  type: "input" | "output";
  lines: string[];
}

export function Terminal({ onCommandRun }: { onCommandRun?: (raw: string) => void }) {
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      type: "output",
      lines: [
        "Microsoft Windows [Version 10.0.19045]",
        "(c) Microsoft Corporation. All rights reserved.",
        "",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;

    const output = runCommand(raw, DEFAULT_NETWORK_STATE);
    setEntries((prev) => [...prev, { type: "input", lines: [raw] }, { type: "output", lines: output }]);
    onCommandRun?.(raw);
    setInput("");
  }

  return (
    // Fixed dark surface in both themes: a terminal that turns white in light
    // mode stops reading as a terminal, and the CLI tab's whole job is to feel
    // like the real thing.
    <div
      className="overflow-hidden rounded-2xl border border-border-strong bg-[oklch(15%_0.015_265)] shadow-lg"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Window chrome. Purely decorative, but it's what makes the panel read
          as a terminal at a glance rather than as a black text box. */}
      <div
        aria-hidden="true"
        className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3.5 py-2.5"
      >
        <span className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[oklch(65%_0.19_25)]" />
          <span className="h-3 w-3 rounded-full bg-[oklch(80%_0.15_85)]" />
          <span className="h-3 w-3 rounded-full bg-[oklch(69%_0.17_152)]" />
        </span>
        <span className="ml-1 font-mono text-xs text-white/45">cmd.exe — practice network</span>
      </div>

      {/* Command output replaces nothing on screen and moves no focus, so
          without a live region a screen-reader user runs a command and hears
          silence. Polite rather than assertive: output arrives as a direct
          result of the user's own submit, so it shouldn't interrupt. */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
        className="h-72 overflow-y-auto p-4 font-mono text-[0.8125rem] leading-relaxed text-gray-100 sm:h-80"
      >
        {entries.map((entry, i) =>
          entry.type === "input" ? (
            <div key={i} className="text-signal-300">
              <span className="text-signal-500 select-none">C:\&gt;</span> {entry.lines[0]}
            </div>
          ) : (
            <div key={i} className="text-gray-300">
              {entry.lines.map((line, j) => (
                <div key={j} className="whitespace-pre">
                  {line || "\u00A0"}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* The app-wide focus ring would draw a light-blue rounded box across
          the prompt row, which reads as a form field rather than a command
          line. The row lights up its own top border instead — same signal,
          in the terminal's own language. */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-white/10 bg-white/[0.03] px-4 py-3 transition-colors has-[:focus-visible]:border-signal-500/60 has-[:focus-visible]:bg-signal-500/5"
      >
        <span className="font-mono text-sm text-signal-400 select-none">C:\&gt;</span>
        <span className="relative flex flex-1 items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Command"
            className="w-full bg-transparent font-mono text-base text-gray-100 caret-transparent outline-none focus-visible:outline-none placeholder:text-white/30 sm:text-sm"
            placeholder="Try: ipconfig /all"
          />
          {/* Block caret drawn at the end of the typed text; the native caret
              is hidden above, because a terminal blinking a thin i-beam
              doesn't read as a terminal. `ch` units line up with the monospace
              advance width. Only rendered while focused, so an idle panel
              isn't animating in the corner of the reader's eye. */}
          {focused && (
            <span
              aria-hidden="true"
              className="animate-caret pointer-events-none absolute top-1/2 h-[1.15em] w-[0.55em] -translate-y-1/2 bg-signal-400/80"
              style={{ left: `${input.length}ch` }}
            />
          )}
        </span>
      </form>
    </div>
  );
}
