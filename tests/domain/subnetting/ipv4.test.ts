import { describe, it, expect } from "vitest";
import { ipToInt, intToIp, isValidIp, cidrToMask, maskToCidr } from "@/lib/domain/subnetting/ipv4";

describe("ipv4", () => {
  it("round-trips ip <-> int", () => {
    expect(intToIp(ipToInt("192.168.1.1"))).toBe("192.168.1.1");
    expect(intToIp(ipToInt("0.0.0.0"))).toBe("0.0.0.0");
    expect(intToIp(ipToInt("255.255.255.255"))).toBe("255.255.255.255");
  });

  it("validates IPv4 addresses", () => {
    expect(isValidIp("192.168.1.1")).toBe(true);
    expect(isValidIp("256.1.1.1")).toBe(false);
    expect(isValidIp("1.2.3")).toBe(false);
    expect(isValidIp("1.2.3.4.5")).toBe(false);
    expect(isValidIp("a.b.c.d")).toBe(false);
  });

  it("converts CIDR to dotted mask", () => {
    expect(cidrToMask(24)).toBe("255.255.255.0");
    expect(cidrToMask(0)).toBe("0.0.0.0");
    expect(cidrToMask(32)).toBe("255.255.255.255");
    expect(cidrToMask(30)).toBe("255.255.255.252");
    expect(cidrToMask(1)).toBe("128.0.0.0");
  });

  it("converts dotted mask to CIDR", () => {
    expect(maskToCidr("255.255.255.0")).toBe(24);
    expect(maskToCidr("0.0.0.0")).toBe(0);
    expect(maskToCidr("255.255.255.255")).toBe(32);
    expect(maskToCidr("255.255.254.0")).toBe(23);
  });

  it("rejects a non-contiguous mask", () => {
    expect(() => maskToCidr("255.255.0.255")).toThrow();
  });
});
