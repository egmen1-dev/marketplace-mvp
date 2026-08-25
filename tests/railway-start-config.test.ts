import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  CANONICAL_RAILWAY_START_COMMAND,
  LEGACY_RAILWAY_START_COMMAND,
  parseRailwayStartCommand,
  verifyRailwayStartConfig,
} from "@/lib/railway/start-config";

describe("Railway start config", () => {
  it("parses startCommand from railway.toml deploy section", () => {
    const toml = `
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "./docker-entrypoint.sh"
healthcheckPath = "/api/health"
`;
    expect(parseRailwayStartCommand(toml)).toBe("./docker-entrypoint.sh");
  });

  it("canonical main uses migration-aware entrypoint, not legacy node server.js", () => {
    const railwayToml = readFileSync("railway.toml", "utf8");
    const startCommand = parseRailwayStartCommand(railwayToml);
    expect(startCommand).toBe(CANONICAL_RAILWAY_START_COMMAND);
    expect(startCommand).not.toBe(LEGACY_RAILWAY_START_COMMAND);
  });

  it("verifyRailwayStartConfig passes for repository canonical config", () => {
    const report = verifyRailwayStartConfig();
    expect(report.verdict).toBe("PASS");
    expect(report.startCommand).toBe(CANONICAL_RAILWAY_START_COMMAND);
  });

  it("fails when railway.toml regresses to node server.js", () => {
    const railwayToml = readFileSync("railway.toml", "utf8").replace(
      CANONICAL_RAILWAY_START_COMMAND,
      LEGACY_RAILWAY_START_COMMAND,
    );
    expect(parseRailwayStartCommand(railwayToml)).toBe(LEGACY_RAILWAY_START_COMMAND);
  });

  it("entrypoint is executable shell script with set -e", () => {
    const entrypoint = readFileSync("scripts/docker-entrypoint.sh", "utf8");
    expect(entrypoint.startsWith("#!/bin/sh")).toBe(true);
    expect(entrypoint).toContain("set -e");
    expect(entrypoint).toContain("prisma migrate deploy");
    expect(entrypoint).toContain("exec node server.js");
  });
});
