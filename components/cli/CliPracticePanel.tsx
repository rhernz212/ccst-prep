"use client";

import { useState } from "react";
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
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("free")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "free"
              ? "bg-brand-600 text-white"
              : "bg-surface-hover text-muted-foreground hover:text-foreground"
          }`}
        >
          Free Exploration
        </button>
        <button
          type="button"
          onClick={() => setMode("scenario")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "scenario"
              ? "bg-brand-600 text-white"
              : "bg-surface-hover text-muted-foreground hover:text-foreground"
          }`}
        >
          Scenario Practice
        </button>
      </div>

      {mode === "scenario" && (
        <ScenarioBrief
          scenario={scenario}
          requiredCommandRun={requiredCommandRun}
          onNext={() => setScenarioIndex((i) => (i + 1) % SCENARIOS.length)}
        />
      )}

      <Terminal onCommandRun={(raw) => setCommandHistory((prev) => [...prev, raw])} />

      <p className="mt-3 text-xs text-muted-foreground">
        Supported commands: ipconfig (/all), ping, tracert, nslookup, netstat. This is a simulated
        network, not a real one — commands run against a fixed practice fixture.
      </p>
    </div>
  );
}
