import { describe, it, expect } from "vitest";
import { normalizeCidrOrMask, gradeRangeProblem, gradeMaskForHostsProblem } from "@/lib/domain/subnetting/grader";
import { computeSubnet } from "@/lib/domain/subnetting/calculator";
import type { RangeProblem, MaskForHostsProblem } from "@/lib/domain/subnetting/problemGenerator";

describe("normalizeCidrOrMask", () => {
  it("accepts /24, 24, and 255.255.255.0 interchangeably", () => {
    expect(normalizeCidrOrMask("/24")).toBe(24);
    expect(normalizeCidrOrMask("24")).toBe(24);
    expect(normalizeCidrOrMask("255.255.255.0")).toBe(24);
    expect(normalizeCidrOrMask("  /24  ")).toBe(24);
  });

  it("returns null for garbage input", () => {
    expect(normalizeCidrOrMask("not-a-mask")).toBeNull();
    expect(normalizeCidrOrMask("/99")).toBeNull();
  });
});

describe("gradeRangeProblem", () => {
  const problem: RangeProblem = {
    id: "t1",
    kind: "find-range",
    difficulty: 3,
    prompt: "",
    ip: "192.168.1.100",
    cidr: 26,
    answer: computeSubnet({ ip: "192.168.1.100", cidr: 26 }),
  };

  it("marks a fully correct answer as correct", () => {
    const result = gradeRangeProblem(problem, {
      network: "192.168.1.64",
      broadcast: "192.168.1.127",
      firstHost: "192.168.1.65",
      lastHost: "192.168.1.126",
      hostCount: "62",
    });
    expect(result.correct).toBe(true);
    expect(Object.values(result.fields).every(Boolean)).toBe(true);
  });

  it("flags only the wrong field", () => {
    const result = gradeRangeProblem(problem, {
      network: "192.168.1.64",
      broadcast: "192.168.1.128", // wrong
      firstHost: "192.168.1.65",
      lastHost: "192.168.1.126",
      hostCount: "62",
    });
    expect(result.correct).toBe(false);
    expect(result.fields.broadcast).toBe(false);
    expect(result.fields.network).toBe(true);
  });
});

describe("gradeMaskForHostsProblem", () => {
  const problem: MaskForHostsProblem = {
    id: "t2",
    kind: "find-mask-for-hosts",
    difficulty: 3,
    prompt: "",
    networkBase: "192.168.10.0",
    requiredHosts: 30,
    answerCidr: 27,
    answerMask: "255.255.255.224",
  };

  it("accepts CIDR or dotted-mask form", () => {
    expect(gradeMaskForHostsProblem(problem, "/27")).toBe(true);
    expect(gradeMaskForHostsProblem(problem, "27")).toBe(true);
    expect(gradeMaskForHostsProblem(problem, "255.255.255.224")).toBe(true);
  });

  it("rejects a wrong mask", () => {
    expect(gradeMaskForHostsProblem(problem, "/28")).toBe(false);
  });
});
