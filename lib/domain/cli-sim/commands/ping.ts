import type { NetworkState } from "../networkState";
import { resolveTarget } from "../resolve";

export function ping(args: string[], _flags: Set<string>, state: NetworkState): string[] {
  const target = args[0];
  if (!target) return ["Usage: ping <hostname or IP address>"];

  const resolved = resolveTarget(target, state);
  if (!resolved) {
    return [`Ping request could not find host ${target}. Please check the name and try again.`];
  }

  const label = resolved.hostname ? `${resolved.hostname} [${resolved.ipAddress}]` : resolved.ipAddress;
  const lines = [`Pinging ${label} with 32 bytes of data:`];

  if (!resolved.reachable) {
    for (let i = 0; i < 4; i++) lines.push("Request timed out.");
    lines.push(
      "",
      `Ping statistics for ${resolved.ipAddress}:`,
      "    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),"
    );
    return lines;
  }

  // Deterministic (not random) so scenario grading stays reproducible.
  const latency = resolved.hopIps.length * 3 + 1;
  for (let i = 0; i < 4; i++) {
    lines.push(`Reply from ${resolved.ipAddress}: bytes=32 time=${latency}ms TTL=64`);
  }
  lines.push(
    "",
    `Ping statistics for ${resolved.ipAddress}:`,
    "    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),",
    "Approximate round trip times in milli-seconds:",
    `    Minimum = ${latency}ms, Maximum = ${latency}ms, Average = ${latency}ms`
  );
  return lines;
}
