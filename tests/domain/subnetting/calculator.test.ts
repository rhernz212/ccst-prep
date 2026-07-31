import { describe, it, expect } from "vitest";
import { computeSubnet, minCidrForHosts } from "@/lib/domain/subnetting/calculator";

describe("computeSubnet", () => {
  it("computes a typical /26 subnet from a host in the middle of the block", () => {
    const result = computeSubnet({ ip: "192.168.1.100", cidr: 26 });
    expect(result.mask).toBe("255.255.255.192");
    expect(result.network).toBe("192.168.1.64");
    expect(result.broadcast).toBe("192.168.1.127");
    expect(result.firstHost).toBe("192.168.1.65");
    expect(result.lastHost).toBe("192.168.1.126");
    expect(result.hostCount).toBe(62);
  });

  it("computes from a dotted mask instead of cidr", () => {
    const result = computeSubnet({ ip: "10.0.0.5", mask: "255.255.255.252" });
    expect(result.cidr).toBe(30);
    expect(result.network).toBe("10.0.0.4");
    expect(result.broadcast).toBe("10.0.0.7");
    expect(result.firstHost).toBe("10.0.0.5");
    expect(result.lastHost).toBe("10.0.0.6");
    expect(result.hostCount).toBe(2);
  });

  it("handles /31 per RFC 3021 (2 usable, network == firstHost)", () => {
    const result = computeSubnet({ ip: "10.0.0.0", cidr: 31 });
    expect(result.network).toBe("10.0.0.0");
    expect(result.broadcast).toBe("10.0.0.1");
    expect(result.firstHost).toBe("10.0.0.0");
    expect(result.lastHost).toBe("10.0.0.1");
    expect(result.hostCount).toBe(2);
  });

  it("handles /32 as a single host route", () => {
    const result = computeSubnet({ ip: "10.0.0.5", cidr: 32 });
    expect(result.network).toBe("10.0.0.5");
    expect(result.broadcast).toBe("10.0.0.5");
    expect(result.firstHost).toBeNull();
    expect(result.lastHost).toBeNull();
    expect(result.hostCount).toBe(1);
  });

  it("handles /0 (the whole address space)", () => {
    const result = computeSubnet({ ip: "10.0.0.5", cidr: 0 });
    expect(result.mask).toBe("0.0.0.0");
    expect(result.network).toBe("0.0.0.0");
    expect(result.broadcast).toBe("255.255.255.255");
    expect(result.firstHost).toBe("0.0.0.1");
    expect(result.lastHost).toBe("255.255.255.254");
    expect(result.hostCount).toBe(4294967294);
  });

  it("throws when neither cidr nor mask is given", () => {
    expect(() => computeSubnet({ ip: "10.0.0.1" })).toThrow();
  });
});

describe("minCidrForHosts", () => {
  it("finds the smallest prefix that fits the required host count", () => {
    expect(minCidrForHosts(1)).toBe(32);
    expect(minCidrForHosts(2)).toBe(31);
    expect(minCidrForHosts(3)).toBe(29);
    expect(minCidrForHosts(6)).toBe(29);
    expect(minCidrForHosts(7)).toBe(28);
    expect(minCidrForHosts(254)).toBe(24);
    expect(minCidrForHosts(255)).toBe(23);
  });

  it("rejects non-positive or non-integer input", () => {
    expect(() => minCidrForHosts(0)).toThrow();
    expect(() => minCidrForHosts(-1)).toThrow();
    expect(() => minCidrForHosts(1.5)).toThrow();
  });
});
