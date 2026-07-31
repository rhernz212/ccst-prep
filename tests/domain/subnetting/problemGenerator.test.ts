import { describe, it, expect } from "vitest";
import { generateProblem } from "@/lib/domain/subnetting/problemGenerator";
import { computeSubnet } from "@/lib/domain/subnetting/calculator";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe("generateProblem", () => {
  it("always produces a range problem whose answer matches computeSubnet directly", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = seededRng(seed);
      const problem = generateProblem(3, rng);
      if (problem.kind === "find-range") {
        const recomputed = computeSubnet({ ip: problem.ip, cidr: problem.cidr });
        expect(problem.answer).toEqual(recomputed);
      }
    }
  });

  it("produces a find-mask-for-hosts problem whose mask actually fits the required hosts", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = seededRng(seed);
      const problem = generateProblem(3, rng);
      if (problem.kind === "find-mask-for-hosts") {
        const result = computeSubnet({ ip: problem.networkBase, cidr: problem.answerCidr });
        expect(result.hostCount).toBeGreaterThanOrEqual(problem.requiredHosts);
      }
    }
  });

  it("respects difficulty bounds for find-range CIDR selection at difficulty 1", () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = seededRng(seed);
      const problem = generateProblem(1, rng);
      if (problem.kind === "find-range") {
        expect([8, 16, 24]).toContain(problem.cidr);
      }
    }
  });
});
