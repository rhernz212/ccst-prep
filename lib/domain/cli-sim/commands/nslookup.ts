import type { NetworkState } from "../networkState";

export function nslookup(args: string[], _flags: Set<string>, state: NetworkState): string[] {
  const target = args[0];
  if (!target) return ["Usage: nslookup <hostname>"];

  const dns = state.localHost.dnsServers[0];
  const remote = state.remoteHosts.find((h) => h.hostname.toLowerCase() === target.toLowerCase());

  if (!remote) {
    return [
      "Server:  UnKnown",
      `Address:  ${dns}`,
      "",
      `*** UnKnown can't find ${target}: Non-existent domain`,
    ];
  }

  return [
    "Server:  UnKnown",
    `Address:  ${dns}`,
    "",
    "Non-authoritative answer:",
    `Name:    ${remote.hostname}`,
    `Address:  ${remote.ipAddress}`,
  ];
}
