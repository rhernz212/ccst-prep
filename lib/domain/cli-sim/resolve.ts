import { isValidIp } from "../subnetting/ipv4";
import type { NetworkState } from "./networkState";

export interface ResolvedTarget {
  hostname?: string;
  ipAddress: string;
  reachable: boolean;
  hopIps: string[];
}

/** Resolves a hostname or IP typed by the user against the fixture network state. */
export function resolveTarget(target: string, state: NetworkState): ResolvedTarget | null {
  const byHostname = state.remoteHosts.find((h) => h.hostname.toLowerCase() === target.toLowerCase());
  if (byHostname) {
    return {
      hostname: byHostname.hostname,
      ipAddress: byHostname.ipAddress,
      reachable: byHostname.reachable,
      hopIps: byHostname.hopIps,
    };
  }

  const byIp = state.remoteHosts.find((h) => h.ipAddress === target);
  if (byIp) {
    return {
      hostname: byIp.hostname,
      ipAddress: byIp.ipAddress,
      reachable: byIp.reachable,
      hopIps: byIp.hopIps,
    };
  }

  if (target.toLowerCase() === "localhost" || target === "127.0.0.1") {
    return { ipAddress: "127.0.0.1", reachable: true, hopIps: [] };
  }
  if (target === state.localHost.ipAddress) {
    return { hostname: state.localHost.hostname, ipAddress: target, reachable: true, hopIps: [] };
  }
  if (target === state.localHost.defaultGateway) {
    return { ipAddress: target, reachable: true, hopIps: [target] };
  }

  // A syntactically valid IP that isn't in our fixture — realistic to
  // treat as present-but-unreachable rather than "unknown host".
  if (isValidIp(target)) {
    return { ipAddress: target, reachable: false, hopIps: [] };
  }

  return null;
}
