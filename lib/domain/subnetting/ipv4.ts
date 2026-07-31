function parseOctets(ip: string): number[] {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) throw new Error(`Invalid IPv4 address: "${ip}"`);
  return parts.map((p) => {
    if (!/^\d{1,3}$/.test(p)) throw new Error(`Invalid IPv4 address: "${ip}"`);
    const n = Number(p);
    if (n < 0 || n > 255) throw new Error(`Invalid IPv4 address: "${ip}"`);
    return n;
  });
}

export function isValidIp(ip: string): boolean {
  try {
    parseOctets(ip);
    return true;
  } catch {
    return false;
  }
}

export function ipToInt(ip: string): number {
  const [a, b, c, d] = parseOctets(ip);
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

export function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

export function cidrToMaskInt(cidr: number): number {
  if (!Number.isInteger(cidr) || cidr < 0 || cidr > 32) {
    throw new Error(`Invalid CIDR prefix: /${cidr}`);
  }
  return cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
}

export function cidrToMask(cidr: number): string {
  return intToIp(cidrToMaskInt(cidr));
}

/** Throws if the mask isn't a contiguous run of 1-bits followed by 0-bits. */
export function maskToCidr(mask: string): number {
  const maskInt = ipToInt(mask);
  let cidr = 0;
  let seenZero = false;
  for (let i = 31; i >= 0; i--) {
    const bit = (maskInt >>> i) & 1;
    if (bit === 1) {
      if (seenZero) throw new Error(`Invalid subnet mask: "${mask}" (bits not contiguous)`);
      cidr++;
    } else {
      seenZero = true;
    }
  }
  return cidr;
}

export function wildcardMaskInt(maskInt: number): number {
  return ~maskInt >>> 0;
}
