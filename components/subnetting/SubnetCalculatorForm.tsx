"use client";

import { useState, type FormEvent } from "react";
import { Calculator } from "lucide-react";
import { computeSubnet, type SubnetResult } from "@/lib/domain/subnetting/calculator";
import { normalizeCidrOrMask } from "@/lib/domain/subnetting/grader";
import { isValidIp } from "@/lib/domain/subnetting/ipv4";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SubnetCalculatorForm() {
  const [ip, setIp] = useState("192.168.1.100");
  const [maskInput, setMaskInput] = useState("/24");
  const [result, setResult] = useState<SubnetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCalculate(e: FormEvent) {
    e.preventDefault();
    if (!isValidIp(ip)) {
      setError("Enter a valid IPv4 address (e.g. 192.168.1.100).");
      setResult(null);
      return;
    }
    const cidr = normalizeCidrOrMask(maskInput);
    if (cidr === null) {
      setError("Enter a valid CIDR (e.g. /24) or subnet mask (e.g. 255.255.255.0).");
      setResult(null);
      return;
    }
    setError(null);
    setResult(computeSubnet({ ip, cidr }));
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-signal-50 text-signal-600 dark:bg-signal-500/15 dark:text-signal-300"
          aria-hidden="true"
        >
          <Calculator className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-fluid-lg font-semibold text-foreground">Subnet calculator</h3>
          <p className="text-sm text-muted-foreground">Check your working, instantly.</p>
        </div>
      </div>

      <form onSubmit={handleCalculate} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="calc-ip" className="block text-sm font-medium text-foreground">
            IP address
          </label>
          <Input
            id="calc-ip"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            inputMode="decimal"
            className="mt-1.5 w-full font-mono"
            placeholder="192.168.1.100"
          />
        </div>
        <div>
          <label htmlFor="calc-mask" className="block text-sm font-medium text-foreground">
            CIDR or subnet mask
          </label>
          <Input
            id="calc-mask"
            value={maskInput}
            onChange={(e) => setMaskInput(e.target.value)}
            className="mt-1.5 w-full font-mono"
            placeholder="/24 or 255.255.255.0"
          />
        </div>
        <Button type="submit">Calculate</Button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-danger-300 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-500/50 dark:bg-danger-500/10 dark:text-danger-300">
          {error}
        </p>
      )}

      {result && (
        <dl className="animate-fade-in mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Field label="Network" value={result.network} emphasis />
          <Field label="Broadcast" value={result.broadcast} emphasis />
          <Field label="Subnet mask" value={result.mask} hint={`/${result.cidr}`} />
          <Field label="Wildcard mask" value={result.wildcardMask} />
          <Field label="First usable host" value={result.firstHost ?? "—"} />
          <Field label="Last usable host" value={result.lastHost ?? "—"} />
          <Field label="Usable hosts" value={result.hostCount.toLocaleString()} />
          <Field label="Total addresses" value={result.totalAddresses.toLocaleString()} />
        </dl>
      )}
    </Card>
  );
}

/*
 * Each result is its own tile rather than a row in a dense definition list —
 * on a phone the flat list ran together into an unscannable block, and the
 * two values people actually look for (network and broadcast) get a tint so
 * they're findable without reading the labels.
 */
function Field({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        emphasis
          ? "border-signal-200 bg-signal-50 dark:border-signal-500/30 dark:bg-signal-500/10"
          : "border-border bg-surface-sunken"
      }`}
    >
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="tabular mt-1 font-mono text-sm font-semibold break-all text-foreground">
        {value}
        {hint && <span className="ml-1 font-normal text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}
