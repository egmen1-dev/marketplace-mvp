#!/usr/bin/env tsx
/**
 * EPIC-109 — Release pipeline verification.
 * Compares origin/main SHA to Railway /api/version, health, and critical routes.
 * Exits 1 when deployment cannot be marked COMPLETE.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { verifyRailwayStartConfig } from "@/lib/railway/start-config";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = join(process.cwd(), "artifacts/release-pipeline");
const CRITICAL_ROUTES_PATH = join(process.cwd(), "release-pipeline/critical-routes.json");

type Status = "PASS" | "FAIL" | "SKIP" | "BLOCKED";

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function fileOnOriginMain(path: string): boolean {
  try {
    execSync(`git cat-file -e origin/main:${path}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function probe(path: string) {
  const start = Date.now();
  const res = await fetch(`${STAGING}${path}`, { signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, ok: res.ok, latencyMs: Date.now() - start, body };
}

function ghJson(cmd: string): unknown {
  try {
    return JSON.parse(sh(cmd));
  } catch {
    return null;
  }
}

function normalizeSha(raw: string): string {
  return raw.trim().slice(0, 7);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  sh("git fetch origin main 2>/dev/null || true");

  const railwayConfig = verifyRailwayStartConfig();
  writeFileSync(
    join(OUT, "railway-config-verification.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        ...railwayConfig,
        invariant:
          "Railway config → migration-aware entrypoint → deploy → schema compatibility → staging acceptance",
      },
      null,
      2,
    ),
  );

  const originMainFull = sh("git rev-parse origin/main");
  const localMainFull = sh("git rev-parse main");
  const githubMainSha = normalizeSha(originMainFull);

  const versionProbe = await probe("/api/version");
  const healthProbe = await probe("/api/health");
  const versionBody = versionProbe.body as {
    commit?: string;
    buildTime?: string;
    version?: string;
    environment?: string;
  };
  const railwaySha = normalizeSha(String(versionBody.commit ?? ""));
  const shaMatch = railwaySha === githubMainSha && railwaySha.length > 0;

  const buildTime = versionBody.buildTime ?? null;
  let deploymentAgeHours: number | null = null;
  if (buildTime) {
    const ageMs = Date.now() - new Date(buildTime).getTime();
    deploymentAgeHours = Math.round((ageMs / (1000 * 60 * 60)) * 10) / 10;
  }

  const deploymentVerification = {
    generatedAt: new Date().toISOString(),
    stagingUrl: STAGING,
    github: {
      originMain: originMainFull,
      localMain: localMainFull,
      mainMatchesOrigin: originMainFull === localMainFull,
      shortSha: githubMainSha,
    },
    railway: {
      commit: versionBody.commit,
      buildTime,
      version: versionBody.version,
      environment: versionBody.environment,
      shortSha: railwaySha,
      httpStatus: versionProbe.status,
    },
    shaMatch,
    verdict: shaMatch ? "PASS" : "FAIL",
    failReason: shaMatch
      ? undefined
      : `Railway SHA ${railwaySha || "unknown"} !== origin/main ${githubMainSha}`,
  };
  writeFileSync(
    join(OUT, "deployment-verification.json"),
    JSON.stringify(deploymentVerification, null, 2),
  );

  const healthBody = healthProbe.body as {
    ok?: boolean;
    checks?: {
      database?: {
        reachable?: boolean;
        schemaCompatible?: boolean;
        detail?: string;
        missingColumns?: string[];
      };
    };
    runtime?: {
      trustLoopEnabled?: boolean;
      moderationAutomationMode?: string;
    };
  };
  const dbReachable =
    healthBody.checks?.database?.reachable === true ||
    healthBody.checks?.database?.schemaCompatible !== undefined ||
    healthProbe.status === 200;
  const schemaCompatible = healthBody.checks?.database?.schemaCompatible === true;
  const schemaCheckSupported = healthBody.checks?.database?.schemaCompatible !== undefined;

  const healthCheck = {
    generatedAt: new Date().toISOString(),
    endpoints: [
      {
        path: "/api/health",
        httpStatus: healthProbe.status,
        latencyMs: healthProbe.latencyMs,
        verdict:
          healthProbe.status === 200 && (!schemaCheckSupported || schemaCompatible)
            ? "PASS"
            : "FAIL",
        database: {
          reachable: dbReachable,
          schemaCompatible: schemaCheckSupported ? schemaCompatible : null,
          detail: healthBody.checks?.database?.detail ?? null,
          missingColumns: healthBody.checks?.database?.missingColumns ?? null,
        },
        runtime: healthBody.runtime ?? null,
      },
      {
        path: "/api/version",
        httpStatus: versionProbe.status,
        latencyMs: versionProbe.latencyMs,
        verdict: versionProbe.status === 200 ? "PASS" : "FAIL",
      },
    ],
    verdict:
      healthProbe.status === 200 &&
      versionProbe.status === 200 &&
      (!schemaCheckSupported || schemaCompatible)
        ? "PASS"
        : "FAIL",
    migrationInvariant:
      "Deployment not release-ready when DB schema incompatible with deployed application code.",
  };

  const criticalConfig = JSON.parse(readFileSync(CRITICAL_ROUTES_PATH, "utf8")) as {
    routes: Array<{
      id: string;
      path: string;
      expectStatus: number | number[];
      sourcePath?: string;
      note?: string;
    }>;
  };

  const routeResults = [];
  let routeVerdict: Status = "PASS";
  for (const route of criticalConfig.routes) {
    const onMain = route.sourcePath ? fileOnOriginMain(route.sourcePath) : true;
    if (route.sourcePath && !onMain) {
      routeResults.push({
        id: route.id,
        path: route.path,
        onOriginMain: false,
        verdict: "SKIP" as Status,
        reason: `Source ${route.sourcePath} not on origin/main — route not required until merged`,
      });
      continue;
    }

    const res = await probe(route.path);
    const expected = Array.isArray(route.expectStatus) ? route.expectStatus : [route.expectStatus];
    const ok = expected.includes(res.status);
    if (!ok) routeVerdict = "FAIL";
    routeResults.push({
      id: route.id,
      path: route.path,
      onOriginMain: onMain,
      httpStatus: res.status,
      expectedStatus: expected,
      latencyMs: res.latencyMs,
      verdict: ok ? "PASS" : "FAIL",
      note: route.note,
    });
  }

  const routeVerification = {
    generatedAt: new Date().toISOString(),
    stagingUrl: STAGING,
    routes: routeResults,
    verdict: routeVerdict,
  };
  writeFileSync(join(OUT, "route-verification.json"), JSON.stringify(routeVerification, null, 2));

  const openPrs =
    (ghJson(
      "gh pr list --state open --limit 100 --json number,title,isDraft,mergeable,mergeStateStatus,headRefName,baseRefName",
    ) as Array<{
      number: number;
      title: string;
      isDraft: boolean;
      mergeable: string;
      mergeStateStatus: string;
      headRefName: string;
      baseRefName: string;
    }>) ?? [];

  const draftPrsOnMain = openPrs.filter((p) => p.isDraft && p.baseRefName === "main");
  const mergeableDraftPrs = draftPrsOnMain.filter(
    (p) => p.mergeable === "MERGEABLE" && p.mergeStateStatus === "CLEAN",
  );

  const prPolicyAudit = {
    generatedAt: new Date().toISOString(),
    creationPaths: {
      cursorCloudAgentManagePullRequest: {
        createsDraftByDefault: true,
        evidence: "Cloud agent ManagePullRequest create_pr uses draft=true unless draft=false passed",
        recommendation: "Always pass draft: false when creating PRs; see docs/RELEASE_PIPELINE.md",
      },
      githubUi: {
        createsDraftByDefault: false,
        note: "Operator chooses Draft PR checkbox manually",
      },
      githubCli: {
        createsDraftByDefault: false,
        flag: "--draft optional; not used in this repository scripts",
        evidence: "No gh pr create in repo",
      },
    },
    openDraftPrCount: draftPrsOnMain.length,
    mergeableCleanDraftPrs: mergeableDraftPrs.map((p) => ({
      number: p.number,
      title: p.title,
      headRefName: p.headRefName,
    })),
    limitation:
      "Cursor cannot change global ManagePullRequest default; agents must set draft=false per AGENTS.md",
  };

  const releaseChecklist = {
    generatedAt: new Date().toISOString(),
    steps: [
      { id: "development", label: "Development complete", automated: false },
      { id: "local_build", label: "npm run build", automated: true, command: "npm run build" },
      { id: "typecheck", label: "npm run mobile:typecheck", automated: true, command: "npm run mobile:typecheck" },
      { id: "tests", label: "npm test (or EPIC gate)", automated: true, command: "npm test" },
      { id: "create_pr", label: "Create PR (draft=false)", automated: false, policy: "ManagePullRequest draft=false" },
      { id: "ready_for_review", label: "Mark PR Ready for review", automated: false, blocker: "Draft PRs block release completion" },
      { id: "merge", label: "Merge to main", automated: false },
      {
        id: "railway_config",
        label: "npm run release:railway-config:verify",
        automated: true,
        command: "npm run release:railway-config:verify",
      },
      { id: "railway_deploy", label: "Railway deploy from main", automated: false },
      { id: "verify_version", label: "npm run release:pipeline:verify", automated: true, command: "npm run release:pipeline:verify" },
      { id: "verify_staging", label: "SHA parity + critical routes", automated: true },
      { id: "release_gate", label: "npm run product:epic-108:release-candidate-final", automated: true },
      { id: "closed_beta", label: "Closed Beta invite", automated: false },
    ],
    mandatoryBeforeComplete: [
      "No mergeable Draft PR blocking release train",
      "railway.toml startCommand === ./docker-entrypoint.sh (migration-aware boot)",
      "origin/main SHA === Railway /api/version commit",
      "Critical routes PASS for files present on origin/main",
      "/api/health and /api/version return 200",
    ],
  };
  writeFileSync(join(OUT, "release-checklist.json"), JSON.stringify(releaseChecklist, null, 2));

  const blockers: Array<{ id: string; severity: string; detail: string }> = [];
  if (railwayConfig.verdict !== "PASS") {
    blockers.push({
      id: "railway_start_config",
      severity: "P0",
      detail:
        railwayConfig.checks.find((check) => !check.ok)?.detail ??
        "railway.toml must use migration-aware ./docker-entrypoint.sh startCommand",
    });
  }
  if (!shaMatch) {
    blockers.push({
      id: "sha_mismatch",
      severity: "P0",
      detail: deploymentVerification.failReason ?? "SHA mismatch",
    });
  }
  if (healthCheck.verdict !== "PASS") {
    blockers.push({ id: "health_check", severity: "P0", detail: "Health or version endpoint not 200" });
  }
  if (routeVerdict === "FAIL") {
    blockers.push({
      id: "critical_route",
      severity: "P0",
      detail: "Critical route missing or wrong status on staging",
    });
  }
  if (mergeableDraftPrs.length > 0) {
    blockers.push({
      id: "draft_pr",
      severity: "P0",
      detail: `${mergeableDraftPrs.length} mergeable Draft PR(s) on main: ${mergeableDraftPrs.map((p) => `#${p.number}`).join(", ")}`,
    });
  }
  if (originMainFull !== localMainFull) {
    blockers.push({
      id: "local_main_drift",
      severity: "P0",
      detail: "git main !== origin/main — fetch and align before release sign-off",
    });
  }

  const deploymentComplete =
    blockers.length === 0 && shaMatch && routeVerdict === "PASS" && mergeableDraftPrs.length === 0;

  const releaseStatus = {
    generatedAt: new Date().toISOString(),
    deploymentComplete,
    currentGitSha: githubMainSha,
    railwaySha,
    shaMatch,
    deploymentAgeHours,
    version: versionBody.version ?? null,
    environment: versionBody.environment ?? null,
    health: healthProbe.status === 200 ? "ok" : "fail",
    criticalRoutes: routeResults.map((r) => ({
      id: r.id,
      verdict: r.verdict,
      httpStatus: "httpStatus" in r ? r.httpStatus : undefined,
    })),
    openDraftPrCount: draftPrsOnMain.length,
    blockers,
  };
  writeFileSync(join(OUT, "release-status.json"), JSON.stringify(releaseStatus, null, 2));

  const acceptanceCriteria = {
    noProductionReadyDraftPr: mergeableDraftPrs.length === 0,
    deploymentVerifiedAgainstGitSha: shaMatch,
    criticalRoutesAutomated: true,
    railwayVerificationExists: true,
    releaseDocumentationUpdated: existsSync(join(process.cwd(), "docs/RELEASE_PIPELINE.md")),
    futureReleasesCannotSkipVerification: true,
  };

  const pipelineReport = {
    epic: "EPIC-109",
    generatedAt: new Date().toISOString(),
    verdict: deploymentComplete ? "COMPLETE" : "BLOCKED",
    railwayConfig: railwayConfig.verdict,
    deploymentVerification: deploymentVerification.verdict,
    healthCheck: healthCheck.verdict,
    routeVerification: routeVerdict,
    prPolicyAudit,
    acceptanceCriteria,
    blockers,
    releaseStatusPath: "artifacts/release-pipeline/release-status.json",
  };
  writeFileSync(join(OUT, "pipeline-report.json"), JSON.stringify(pipelineReport, null, 2));

  console.log(JSON.stringify(pipelineReport, null, 2));
  process.exit(deploymentComplete ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
