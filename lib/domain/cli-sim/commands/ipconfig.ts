import type { NetworkState } from "../networkState";

export function ipconfig(_args: string[], flags: Set<string>, state: NetworkState): string[] {
  const { localHost } = state;
  const all = flags.has("all");

  const lines = ["", "Windows IP Configuration", ""];
  if (all) {
    lines.push(
      `   Host Name . . . . . . . . . . . : ${localHost.hostname}`,
      `   Primary Dns Suffix  . . . . . . . :`,
      ""
    );
  }
  lines.push("Ethernet adapter Ethernet:", "");
  if (all) {
    lines.push(
      `   Description . . . . . . . . . . . : Realtek PCIe GbE Family Controller`,
      `   Physical Address. . . . . . . . . : ${localHost.macAddress}`,
      `   DHCP Enabled. . . . . . . . . . . : No`
    );
  }
  lines.push(
    `   Connection-specific DNS Suffix  . :`,
    `   IPv4 Address. . . . . . . . . . . : ${localHost.ipAddress}`,
    `   Subnet Mask . . . . . . . . . . . : ${localHost.subnetMask}`,
    `   Default Gateway . . . . . . . . . : ${localHost.defaultGateway}`
  );
  if (all) {
    localHost.dnsServers.forEach((dns, i) => {
      lines.push(
        i === 0
          ? `   DNS Servers . . . . . . . . . . . : ${dns}`
          : `                                       ${dns}`
      );
    });
  }
  return lines;
}
