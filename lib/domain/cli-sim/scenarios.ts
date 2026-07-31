import { DEFAULT_NETWORK_STATE } from "./networkState";

export interface Scenario {
  id: string;
  prompt: string;
  /** If set, the user must have run a matching command before their answer is checked. */
  requiredCommand?: RegExp;
  expectedAnswer: string;
}

const { localHost, remoteHosts } = DEFAULT_NETWORK_STATE;
const lammle = remoteHosts.find((h) => h.hostname === "www.lammle.com")!;
const unreachable = remoteHosts.find((h) => h.hostname === "unreachable.example.com")!;

/**
 * Fixed, curated scenarios against DEFAULT_NETWORK_STATE. Grading compares
 * the user's typed answer (what they read out of the terminal output) to
 * the known-correct value — it does not fuzzy-match command output, since
 * the skill being tested is interpreting output, not producing it verbatim.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: "default-gateway",
    prompt: "Find this computer's default gateway address, then type it below.",
    requiredCommand: /^ipconfig/i,
    expectedAnswer: localHost.defaultGateway,
  },
  {
    id: "local-ip",
    prompt: "What is this computer's own IPv4 address?",
    requiredCommand: /^ipconfig/i,
    expectedAnswer: localHost.ipAddress,
  },
  {
    id: "resolve-hostname",
    prompt: `What IP address does ${lammle.hostname} resolve to?`,
    requiredCommand: /^nslookup/i,
    expectedAnswer: lammle.ipAddress,
  },
  {
    id: "unreachable-host",
    prompt: `Is ${unreachable.hostname} reachable from this computer? Answer "yes" or "no".`,
    requiredCommand: /^ping/i,
    expectedAnswer: "no",
  },
  {
    id: "hop-count",
    prompt: `How many hops does it take to reach ${lammle.hostname}?`,
    requiredCommand: /^(tracert|traceroute)/i,
    expectedAnswer: String(lammle.hopIps.length),
  },
];
