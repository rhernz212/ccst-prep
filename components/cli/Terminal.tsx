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
    <div
      className="rounded-lg border border-border-strong bg-black font-mono text-sm text-gray-100"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Command output replaces nothing on screen and moves no focus, so
          without a live region a screen-reader user runs a command and hears
          silence. Polite rather than assertive: output arrives as a direct
          result of the user's own submit, so it shouldn't interrupt. */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
        className="h-80 overflow-y-auto p-3"
      >
        {entries.map((entry, i) =>
          entry.type === "input" ? (
            <div key={i} className="text-green-400">
              C:\&gt; {entry.lines[0]}
            </div>
          ) : (
            <div key={i}>
              {entry.lines.map((line, j) => (
                <div key={j} className="whitespace-pre">
                  {line || "\u00A0"}
                </div>
              ))}
            </div>
          )
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border-strong px-3 py-2">
        <span className="text-green-400">C:\&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-gray-100 outline-none"
          placeholder="Type a command (e.g. ipconfig /all)"
        />
      </form>
    </div>
  );
}
