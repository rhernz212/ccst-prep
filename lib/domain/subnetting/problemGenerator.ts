import { ipToInt, intToIp, cidrToMaskInt, cidrToMask } from "./ipv4";
import { computeSubnet, minCidrForHosts, type SubnetResult } from "./calculator";

export interface RangeProblem {
  id: string;
  kind: "find-range";
  difficulty: number;
  prompt: string;
  ip: string;
  cidr: number;
  answer: SubnetResult;
}

export interface MaskForHostsProblem {
  id: string;
  kind: "find-mask-for-hosts";
  difficulty: number;
  prompt: string;
  networkBase: string;
  requiredHosts: number;
  answerCidr: number;
  answerMask: string;
}

export type SubnettingProblem = RangeProblem | MaskForHostsProblem;

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomId(rng: () => number): string {
  return rng().toString(36).slice(2, 10);
}

/** Keeps generated addresses within common private ranges, for realism. */
function randomPrivateBase(rng: () => number): string {
  const choice = randomInt(0, 2, rng);
  if (choice === 0) return `10.${randomInt(0, 255, rng)}.${randomInt(0, 255, rng)}.0`;
  if (choice === 1) return `172.${randomInt(16, 31, rng)}.${randomInt(0, 255, rng)}.0`;
  return `192.168.${randomInt(0, 255, rng)}.0`;
}

const CIDR_BANDS: number[][] = [
  [8, 16, 24],
  [16, 20, 24, 28],
  [8, 12, 16, 20, 24, 28],
  Array.from({ length: 23 }, (_, i) => i + 8), // 8..30
  Array.from({ length: 30 }, (_, i) => i + 1), // 1..30
];

const HOST_COUNT_BANDS: [number, number][] = [
  [2, 14],
  [15, 30],
  [31, 62],
  [63, 126],
  [127, 510],
];

function clampDifficulty(difficulty: number): number {
  return Math.min(Math.max(Math.round(difficulty), 1), 5);
}

function randomIpWithinBlock(networkInt: number, cidr: number, rng: () => number): number {
  const hostBits = 32 - cidr;
  if (hostBits === 0) return networkInt;
  const blockSize = 2 ** hostBits;
  const offset = randomInt(0, blockSize - 1, rng);
  return (networkInt + offset) >>> 0;
}

function generateRangeProblem(difficulty: number, rng: () => number): RangeProblem {
  const band = CIDR_BANDS[clampDifficulty(difficulty) - 1];
  const cidr = band[randomInt(0, band.length - 1, rng)];

  const baseInt = ipToInt(randomPrivateBase(rng));
  const maskInt = cidrToMaskInt(cidr);
  const networkInt = (baseInt & maskInt) >>> 0;
  const ip = intToIp(randomIpWithinBlock(networkInt, cidr, rng));
  const answer = computeSubnet({ ip, cidr });

  return {
    id: randomId(rng),
    kind: "find-range",
    difficulty,
    prompt: `Given the host address ${ip}/${cidr}, find the network address, broadcast address, usable host range, and number of usable hosts.`,
    ip,
    cidr,
    answer,
  };
}

function generateMaskForHostsProblem(difficulty: number, rng: () => number): MaskForHostsProblem {
  const [lo, hi] = HOST_COUNT_BANDS[clampDifficulty(difficulty) - 1];
  const requiredHosts = randomInt(lo, hi, rng);
  const networkBase = randomPrivateBase(rng);
  const answerCidr = minCidrForHosts(requiredHosts);

  return {
    id: randomId(rng),
    kind: "find-mask-for-hosts",
    difficulty,
    prompt: `You need at least ${requiredHosts} usable host addresses on network ${networkBase}. What subnet mask (or CIDR) should you use?`,
    networkBase,
    requiredHosts,
    answerCidr,
    answerMask: cidrToMask(answerCidr),
  };
}

/**
 * Generates a random subnetting practice problem. The answer is always
 * computed via calculator.ts, so the generator and the grader can never
 * disagree. Pass an explicit `rng` (0-1 generator) for deterministic
 * output in tests.
 */
export function generateProblem(
  difficulty: number = 3,
  rng: () => number = Math.random
): SubnettingProblem {
  return rng() < 0.5 ? generateRangeProblem(difficulty, rng) : generateMaskForHostsProblem(difficulty, rng);
}
