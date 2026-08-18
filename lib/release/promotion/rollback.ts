import { execSync } from "node:child_process";

import { DEFAULT_STAGING_URL } from "./config";
import type { PromotionStatus, RollbackReport } from "./types";

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

async function probe(baseUrl: string, path: string) {
  const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(20000) });
  return { status: res.status, ok: res.ok };
}

/**
 * Read-only rollback readiness — does NOT trigger Railway rollback.
 */
export class PromotionRollback {
  constructor(private stagingUrl = process.env.STAGING_BASE_URL ?? DEFAULT_STAGING_URL) {}

  async assess(): Promise<RollbackReport> {
    sh("git fetch origin main 2>/dev/null || true");
    const current = sh("git rev-parse origin/main");
    const previous = sh("git rev-parse origin/main~1 2>/dev/null || echo unknown");
    let rollbackPointReachable = false;
    try {
      sh(`git merge-base --is-ancestor ${previous} origin/main && echo ok`);
      rollbackPointReachable = previous !== "unknown";
    } catch {
      rollbackPointReachable = false;
    }

    const health = await probe(this.stagingUrl, "/api/health");
    const version = await probe(this.stagingUrl, "/api/version");

    const healthVerdict: PromotionStatus = health.status === 200 ? "PASS" : "FAIL";
    const versionVerdict: PromotionStatus = version.status === 200 ? "PASS" : "FAIL";

    return {
      generatedAt: new Date().toISOString(),
      currentCommit: current,
      previousMainCommit: previous,
      rollbackPointReachable,
      healthOnStaging: healthVerdict,
      versionOnStaging: versionVerdict,
      automaticRollbackPerformed: false,
      operatorNote:
        "Rollback is manual via Railway dashboard → previous deployment. This report only verifies git parent and live health.",
      verdict:
        rollbackPointReachable && healthVerdict === "PASS" && versionVerdict === "PASS"
          ? "PASS"
          : "FAIL",
    };
  }
}
