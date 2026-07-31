import type { NetworkState } from "./networkState";
import { ipconfig } from "./commands/ipconfig";
import { ping } from "./commands/ping";
import { tracert } from "./commands/tracert";
import { nslookup } from "./commands/nslookup";
import { netstat } from "./commands/netstat";

export interface ParsedCommand {
  cmd: string;
  args: string[];
  flags: Set<string>;
}

/** Splits flags (leading - or /) from positional args and lowercases the command name. */
export function parseCommand(raw: string): ParsedCommand {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const cmd = (tokens[0] ?? "").toLowerCase();
  const flags = new Set<string>();
  const args: string[] = [];

  for (const token of tokens.slice(1)) {
    if (token.startsWith("-") || token.startsWith("/")) {
      flags.add(token.replace(/^[-/]+/, "").toLowerCase());
    } else {
      args.push(token);
    }
  }
  return { cmd, args, flags };
}

type CommandHandler = (args: string[], flags: Set<string>, state: NetworkState) => string[];

const HANDLERS: Record<string, CommandHandler> = {
  ipconfig,
  ifconfig: ipconfig,
  ping,
  tracert,
  traceroute: tracert,
  nslookup,
  netstat,
};

/** Runs one command line against the fixture network state, returning output lines. */
export function runCommand(raw: string, state: NetworkState): string[] {
  const { cmd, args, flags } = parseCommand(raw);
  if (!cmd) return [];

  const handler = HANDLERS[cmd];
  if (!handler) {
    return [`'${cmd}' is not recognized as an internal or external command, operable program or batch file.`];
  }
  return handler(args, flags, state);
}
