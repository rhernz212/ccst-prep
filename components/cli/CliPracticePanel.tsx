"use client";

import { useState } from "react";
import { Compass, Target } from "lucide-react";
import { Terminal } from "./Terminal";
import { ScenarioBrief } from "./ScenarioBrief";
import { SCENARIOS } from "@/lib/domain/cli-sim/scenarios";

export function CliPracticePanel() {
  const [mode, setMode] = useState<"free" | "scenario">("free");
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  const scenario = SCENARIOS[scenarioIndex];
  const requiredCommandRun =
    !scenario.requiredCommand || commandHistory.some((c) => scenario.requiredCommand!.test(c));

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Practice mode"
        className="mb-4 inline-flex rounded-xl border border-border bg-surface-sunken p-1"
      >
        {(
          [
            { value: "free", label: "Free exploration", icon: Compass },
            { value: "scenario", label: "Scenario practice", icon: Target },
          ] as const
        ).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-200 ease-[var(--ease-spring)] active:scale-[0.97] ${
              mode === value
                ? "surface-card text-brand-700 dark:text-brand-300"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {mode === "scenario" && (
        <ScenarioBrief
          scenario={scenario}
          requiredCommandRun={requiredCommandRun}
          onNext={() => setScenarioIndex((i) => (i + 1) % SCENARIOS.length)}
        />
      )}

      <Terminal onCommandRun={(raw) => setCommandHistory((prev) => [...prev, raw])} />

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Supported:</span>
        {["ipconfig /all", "ping", "tracert", "nslookup", "netstat"].map((cmd) => (
          <code
            key={cmd}
            className="rounded-md border border-border bg-surface-hover px-1.5 py-0.5 font-mono text-xs text-foreground"
          >
            {cmd}
          </code>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        This is a simulated network, not a real one — commands run against a fixed practice
        fixture.
      </p>
    </div>
  );
}
