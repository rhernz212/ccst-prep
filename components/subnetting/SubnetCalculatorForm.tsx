"use client";

import { useState, type FormEvent } from "react";
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
    <Card className="p-5">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Subnet Calculator</h3>
      <form onSubmit={handleCalculate} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="calc-ip" className="block text-sm font-medium text-foreground">
            IP address
          </label>
          <Input
            id="calc-ip"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            className="mt-1 w-48"
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
            className="mt-1 w-48"
            placeholder="/24 or 255.255.255.0"
          />
        </div>
        <Button type="submit">Calculate</Button>
      </form>

      {error && <p className="mt-3 text-sm text-danger-600 dark:text-danger-400">{error}</p>}

      {result && (
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 animate-fade-in">
          <Field label="Network" value={result.network} />
          <Field label="Broadcast" value={result.broadcast} />
          <Field label="Subnet mask" value={`${result.mask} (/${result.cidr})`} />
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium text-foreground">{value}</dd>
    </div>
  );
}
