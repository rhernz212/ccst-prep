export interface HostConfig {
  hostname: string;
  ipAddress: string;
  subnetMask: string;
  defaultGateway: string;
  dnsServers: string[];
  macAddress: string;
}

export interface RemoteHost {
  hostname: string;
  ipAddress: string;
  reachable: boolean;
  /** Simulated route hops from the local host to this remote, in order. */
  hopIps: string[];
}

export interface ArpEntry {
  ipAddress: string;
  macAddress: string;
}

export interface NetworkState {
  localHost: HostConfig;
  arpTable: ArpEntry[];
  remoteHosts: RemoteHost[];
}

/**
 * A small, fixed, deterministic network fixture — not a real network call.
 * Every command module reads from this (or an equivalent state object) to
 * produce realistic-looking output.
 */
export const DEFAULT_NETWORK_STATE: NetworkState = {
  localHost: {
    hostname: "DESKTOP-A1B2C3",
    ipAddress: "192.168.1.50",
    subnetMask: "255.255.255.0",
    defaultGateway: "192.168.1.1",
    dnsServers: ["192.168.1.1", "8.8.8.8"],
    macAddress: "00-14-22-01-23-45",
  },
  arpTable: [
    { ipAddress: "192.168.1.1", macAddress: "AA-BB-CC-00-00-01" },
    { ipAddress: "192.168.1.20", macAddress: "AA-BB-CC-00-00-02" },
  ],
  remoteHosts: [
    {
      hostname: "www.lammle.com",
      ipAddress: "203.0.113.10",
      reachable: true,
      hopIps: ["192.168.1.1", "198.51.100.1", "203.0.113.10"],
    },
    {
      hostname: "fileserver.local",
      ipAddress: "192.168.1.20",
      reachable: true,
      hopIps: ["192.168.1.20"],
    },
    {
      hostname: "unreachable.example.com",
      ipAddress: "203.0.113.99",
      reachable: false,
      hopIps: [],
    },
  ],
};
