import type { NetworkState } from "../networkState";

export function netstat(_args: string[], _flags: Set<string>, state: NetworkState): string[] {
  return [
    "",
    "Active Connections",
    "",
    "  Proto  Local Address          Foreign Address        State",
    `  TCP    ${state.localHost.ipAddress}:51820        203.0.113.10:443       ESTABLISHED`,
    `  TCP    ${state.localHost.ipAddress}:51821        192.168.1.1:22         ESTABLISHED`,
  ];
}
