import { ipToInt, intToIp, cidrToMaskInt, maskToCidr, wildcardMaskInt } from "./ipv4";

export interface SubnetInput {
  ip: string;
  cidr?: number;
  mask?: string;
}

export interface SubnetResult {
  ip: string;
  cidr: number;
  mask: string;
  wildcardMask: string;
  network: string;
  broadcast: string;
  /** null only for /32 and /31, which have no meaningful usable-host concept beyond the addresses themselves. */
  firstHost: string | null;
  lastHost: string | null;
  hostCount: number;
  totalAddresses: number;
}

/**
 * Computes network/broadcast/usable-range for a host address + prefix.
 * Accepts either `cidr` or `mask` (dotted-decimal) — exactly one of the
 * two is required. /31 is treated per RFC 3021 (2 usable addresses, no
 * network/broadcast distinction); /32 is a single host route.
 */
export function computeSubnet(input: SubnetInput): SubnetResult {
  if (input.cidr === undefined && input.mask === undefined) {
    throw new Error("computeSubnet requires either cidr or mask");
  }
  const cidr = input.cidr ?? maskToCidr(input.mask!);
  const maskInt = cidrToMaskInt(cidr);
  const ipInt = ipToInt(input.ip);
  const networkInt = (ipInt & maskInt) >>> 0;
  const wildcardInt = wildcardMaskInt(maskInt);
  const broadcastInt = (networkInt | wildcardInt) >>> 0;
  const totalAddresses = 2 ** (32 - cidr);

  let hostCount: number;
  let firstHost: string | null;
  let lastHost: string | null;

  if (cidr === 32) {
    hostCount = 1;
    firstHost = null;
    lastHost = null;
  } else if (cidr === 31) {
    hostCount = 2;
    firstHost = intToIp(networkInt);
    lastHost = intToIp(broadcastInt);
  } else {
    hostCount = totalAddresses - 2;
    firstHost = intToIp((networkInt + 1) >>> 0);
    lastHost = intToIp((broadcastInt - 1) >>> 0);
  }

  return {
    ip: input.ip,
    cidr,
    mask: intToIp(maskInt),
    wildcardMask: intToIp(wildcardInt),
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    firstHost,
    lastHost,
    hostCount,
    totalAddresses,
  };
}

/** Smallest prefix length whose subnet has at least `requiredHosts` usable addresses. */
export function minCidrForHosts(requiredHosts: number): number {
  if (!Number.isInteger(requiredHosts) || requiredHosts <= 0) {
    throw new Error("requiredHosts must be a positive integer");
  }
  if (requiredHosts === 1) return 32;
  if (requiredHosts === 2) return 31;

  let hostBits = 2;
  while (2 ** hostBits - 2 < requiredHosts) {
    hostBits++;
    if (hostBits > 30) throw new Error("requiredHosts is too large for a single IPv4 subnet");
  }
  return 32 - hostBits;
}
