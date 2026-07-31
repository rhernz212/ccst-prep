import { describe, it, expect } from "vitest";
import { parseCommand, runCommand } from "@/lib/domain/cli-sim/interpreter";
import { DEFAULT_NETWORK_STATE } from "@/lib/domain/cli-sim/networkState";

describe("parseCommand", () => {
  it("splits command, args, and flags (flags are presence-based, not key/value)", () => {
    const parsed = parseCommand("ping www.lammle.com -n 4");
    expect(parsed.cmd).toBe("ping");
    // "4" isn't prefixed with -/, so it's a positional arg alongside the hostname.
    expect(parsed.args).toEqual(["www.lammle.com", "4"]);
    expect(parsed.flags.has("n")).toBe(true);
  });

  it("lowercases the command name and normalizes Windows-style /flags", () => {
    const parsed = parseCommand("IPCONFIG /all");
    expect(parsed.cmd).toBe("ipconfig");
    expect(parsed.flags.has("all")).toBe(true);
  });

  it("handles empty input", () => {
    expect(parseCommand("   ").cmd).toBe("");
  });
});

describe("runCommand", () => {
  it("returns an unrecognized-command message for unknown commands", () => {
    const lines = runCommand("frobnicate", DEFAULT_NETWORK_STATE);
    expect(lines[0]).toMatch(/not recognized/);
  });

  it("ipconfig reports the local IPv4 address and gateway", () => {
    const lines = runCommand("ipconfig", DEFAULT_NETWORK_STATE).join("\n");
    expect(lines).toContain(DEFAULT_NETWORK_STATE.localHost.ipAddress);
    expect(lines).toContain(DEFAULT_NETWORK_STATE.localHost.defaultGateway);
  });

  it("ipconfig /all additionally reports the MAC address and DNS servers", () => {
    const lines = runCommand("ipconfig /all", DEFAULT_NETWORK_STATE).join("\n");
    expect(lines).toContain(DEFAULT_NETWORK_STATE.localHost.macAddress);
    expect(lines).toContain(DEFAULT_NETWORK_STATE.localHost.dnsServers[0]);
  });

  it("ping against a reachable remote host succeeds with 0% loss", () => {
    const lines = runCommand("ping www.lammle.com", DEFAULT_NETWORK_STATE).join("\n");
    expect(lines).toContain("Lost = 0 (0% loss)");
  });

  it("ping against the unreachable fixture host times out", () => {
    const lines = runCommand("ping unreachable.example.com", DEFAULT_NETWORK_STATE).join("\n");
    expect(lines).toContain("Lost = 4 (100% loss)");
  });

  it("tracert reports the same hop count as the fixture", () => {
    const lines = runCommand("tracert www.lammle.com", DEFAULT_NETWORK_STATE);
    const hopLines = lines.filter((l) => /^\s*\d+\s/.test(l));
    expect(hopLines).toHaveLength(3);
  });

  it("nslookup resolves a known hostname to its fixture IP", () => {
    const lines = runCommand("nslookup www.lammle.com", DEFAULT_NETWORK_STATE).join("\n");
    expect(lines).toContain("203.0.113.10");
  });

  it("nslookup reports non-existent domain for an unknown hostname", () => {
    const lines = runCommand("nslookup nowhere.invalid", DEFAULT_NETWORK_STATE).join("\n");
    expect(lines).toMatch(/Non-existent domain/);
  });
});
