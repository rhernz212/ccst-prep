import type { NetworkState } from "../networkState";
import { resolveTarget } from "../resolve";

export function tracert(args: string[], _flags: Set<string>, state: NetworkState): string[] {
  const target = args[0];
  if (!target) return ["Usage: tracert <hostname or IP address>"];

  const resolved = resolveTarget(target, state);
  if (!resolved) {
    return [`Unable to resolve target system name ${target}.`];
  }

  const label = resolved.hostname ? `${resolved.hostname} [${resolved.ipAddress}]` : resolved.ipAddress;
  const lines = [`Tracing route to ${label}`, "over a maximum of 30 hops:", ""];

  if (!resolved.reachable || resolved.hopIps.length === 0) {
    lines.push("  1     *        *        *     Request timed out.");
    return lines;
  }

  resolved.hopIps.forEach((hop, i) => {
    const t = (i + 1) * 3;
    lines.push(`  ${i + 1}    ${t} ms    ${t} ms    ${t} ms  ${hop}`);
  });
  lines.push("", "Trace complete.");
  return lines;
}
