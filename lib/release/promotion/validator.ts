import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_STAGING_URL, RAILWAY_ROUTE_PROBE_PATHS } from "./config";
import type {
  DeploymentDiffReport,
  ReleaseEvidence,
  RouteProbeResult,
  ShaQuartet,
} from "./types";

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function normalizeSha(raw: string): string {
  return raw.trim().slice(0, 7);
}

function fileOnRef(ref: string, path: string): boolean {
  try {
    execSync(`git cat-file -e ${ref}:${path}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function probe(baseUrl: string, path: string) {
  const start = Date.now();
  const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 120) };
  }
  return { status: res.status, body, latencyMs: Date.now() - start };
}

export class PromotionValidator {
  constructor(private stagingUrl = process.env.STAGING_BASE_URL ?? DEFAULT_STAGING_URL) {}

  async verifyShaQuartetAsync(): Promise<ShaQuartet> {
    sh("git fetch origin main 2>/dev/null || true");
    const head = normalizeSha(sh("git rev-parse HEAD"));
    const localMain = normalizeSha(sh("git rev-parse main"));
    const originMain = normalizeSha(sh("git rev-parse origin/main"));
    const version = await probe(this.stagingUrl, "/api/version");
    const railway = normalizeSha(String((version.body as { commit?: string }).commit ?? ""));
    const allMatch =
      head.length > 0 &&
      head === localMain &&
      localMain === originMain &&
      originMain === railway;
    return {
      head,
      localMain,
      originMain,
      railway,
      allMatch,
      verdict: allMatch ? "PASS" : "FAIL",
    };
  }

  async verifyRoutes(): Promise<RouteProbeResult[]> {
    const results: RouteProbeResult[] = [];
    for (const route of RAILWAY_ROUTE_PROBE_PATHS) {
      const onMain = route.sourcePath ? fileOnRef("origin/main", route.sourcePath) : true;
      if (route.sourcePath && !onMain) {
        results.push({
          id: route.id,
          path: route.path,
          httpStatus: 0,
          expectedStatus: Array.isArray(route.expectStatus) ? route.expectStatus : [route.expectStatus],
          latencyMs: 0,
          onOriginMain: false,
          verdict: "SKIP",
        });
        continue;
      }
      const res = await probe(this.stagingUrl, route.path);
      const expected = Array.isArray(route.expectStatus) ? route.expectStatus : [route.expectStatus];
      const ok = expected.includes(res.status);
      results.push({
        id: route.id,
        path: route.path,
        httpStatus: res.status,
        expectedStatus: expected,
        latencyMs: res.latencyMs,
        onOriginMain: onMain,
        verdict: ok ? "PASS" : "FAIL",
      });
    }
    return results;
  }

  async buildDeploymentDiff(): Promise<DeploymentDiffReport> {
    sh("git fetch origin main 2>/dev/null || true");
    const originMain = sh("git rev-parse origin/main");
    const routesOnMain = sh("git ls-tree -r origin/main --name-only app/api")
      .split("\n")
      .filter((p) => p.endsWith("/route.ts"));

    const versionRes = await probe(this.stagingUrl, "/api/version");
    const body = versionRes.body as { commit?: string; buildTime?: string; version?: string };
    const routeProbes = await this.verifyRoutes();
    const missingRoutes = routeProbes
      .filter((r) => r.onOriginMain && r.verdict === "FAIL" && r.httpStatus === 404)
      .map((r) => r.path);
    const unexpected404 = routeProbes.filter((r) => r.httpStatus === 404).map((r) => r.id);

    let buildInfoCommit = "";
    try {
      const raw = readFileSync(join(process.cwd(), "lib/build-info.generated.json"), "utf8");
      buildInfoCommit = normalizeSha((JSON.parse(raw) as { commit?: string }).commit ?? "");
    } catch {
      /* optional */
    }

    const railwaySha = normalizeSha(body.commit ?? "");
    const mainSha = normalizeSha(originMain);

    return {
      generatedAt: new Date().toISOString(),
      railway: {
        commit: body.commit,
        buildTime: body.buildTime,
        version: body.version,
      },
      expected: {
        commit: originMain,
        routesOnMain,
        localBuildInfoCommit: buildInfoCommit,
      },
      missingRoutes,
      unexpected404,
      commitParity: railwaySha === mainSha,
      verdict: railwaySha === mainSha && missingRoutes.length === 0 ? "PASS" : "FAIL",
    };
  }

  async buildReleaseEvidence(): Promise<ReleaseEvidence> {
    const sha = await this.verifyShaQuartetAsync();
    const versionRes = await probe(this.stagingUrl, "/api/version");
    const healthRes = await probe(this.stagingUrl, "/api/health");
    const routes = await this.verifyRoutes();
    const readinessRes = await probe(this.stagingUrl, "/api/product-ops/beta/readiness");
    const readinessBody = readinessRes.body as { recommendation?: string };

    const body = versionRes.body as {
      commit?: string;
      buildTime?: string;
      version?: string;
      environment?: string;
    };

    return {
      generatedAt: new Date().toISOString(),
      sha,
      buildTime: body.buildTime ?? null,
      deploymentId: process.env.RAILWAY_DEPLOYMENT_ID ?? null,
      railwayUrl: this.stagingUrl,
      version: body.version ?? null,
      environment: body.environment ?? null,
      routeRegistration: routes,
      health: {
        status: healthRes.status,
        verdict: healthRes.status === 200 ? "PASS" : "FAIL",
      },
      betaReadiness: {
        status: readinessRes.status,
        verdict: readinessRes.status === 200 ? "PASS" : "FAIL",
        recommendation: readinessBody.recommendation,
      },
    };
  }
}
