#!/usr/bin/env tsx
/**
 * Release gate — Railway must boot via migration-aware entrypoint, not direct node server.js.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { verifyRailwayStartConfig } from "@/lib/railway/start-config";

const OUT = join(process.cwd(), "artifacts/release-pipeline");

function main() {
  mkdirSync(OUT, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    ...verifyRailwayStartConfig(),
    invariant:
      "Railway web-v2 must use ./docker-entrypoint.sh so prisma migrate deploy runs before Next.js.",
  };
  writeFileSync(join(OUT, "railway-config-verification.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.verdict === "PASS" ? 0 : 1);
}

main();
