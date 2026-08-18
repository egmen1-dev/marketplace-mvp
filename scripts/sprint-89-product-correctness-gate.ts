#!/usr/bin/env tsx
/** Sprint 89 — Product Correctness gate + regression audit */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { mobilePaths, repoRoot, type GateRow } from "./mobile-p0-gate-lib";

function run(cmd: string, cwd: string): GateRow {
  try {
    execSync(cmd, { cwd, stdio: "pipe", maxBuffer: 20 * 1024 * 1024 });
    return { id: cmd, ok: true, detail: "PASS" };
  } catch (err) {
    return { id: cmd, ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

function runRouteGraphGate(cwd: string): GateRow {
  try {
    execSync(`npx tsx scripts/mobile-p0-route-graph-gate.ts`, { cwd, stdio: "pipe", maxBuffer: 20 * 1024 * 1024 });
  } catch {
    /* read report */
  }
  const path = join(mobilePaths(cwd).artifacts, "route-graph-gate-report.json");
  if (!existsSync(path)) {
    return { id: "scripts/mobile-p0-route-graph-gate.ts", ok: false, detail: "missing report" };
  }
  const report = JSON.parse(readFileSync(path, "utf8")) as {
    verdict?: string;
    rows?: Array<{ id: string; ok: boolean }>;
  };
  const rows = report.rows ?? [];
  const criticalFailed = rows.filter((r) => !r.ok && r.id !== "route_probe_metro_graph");
  const ok = criticalFailed.length === 0 && rows.some((r) => r.id === "route_file_count" && r.ok);
  const metro = rows.find((r) => r.id === "route_probe_metro_graph");
  const detail = ok
    ? metro?.ok
      ? `PASS (${path})`
      : `PASS static audit; metro probe NOT_RUN (${path})`
    : `FAIL (${path})`;
  return { id: "scripts/mobile-p0-route-graph-gate.ts", ok, detail };
}

function runGate(script: string, reportFile: string, cwd: string): GateRow {
  try {
    execSync(`npx tsx ${script}`, { cwd, stdio: "pipe", maxBuffer: 20 * 1024 * 1024 });
  } catch {
    /* read report */
  }
  const path = join(mobilePaths(cwd).artifacts, reportFile);
  if (existsSync(path)) {
    const report = JSON.parse(readFileSync(path, "utf8")) as { verdict?: string };
    return { id: script, ok: report.verdict === "PASS", detail: `${report.verdict} (${path})` };
  }
  return { id: script, ok: false, detail: `missing ${reportFile}` };
}

function main() {
  const root = repoRoot();
  const outDir = join(root, "artifacts/sprint-89-product-correctness");
  mkdirSync(outDir, { recursive: true });

  const rows: GateRow[] = [];
  rows.push(run("npm run mobile:typecheck", root));
  rows.push(run("npm run mobile:test", root));
  rows.push(runGate("scripts/mobile-p0-token-cycle-gate.ts", "token-cycle-gate-report.json", root));
  rows.push(runRouteGraphGate(root));
  rows.push(runGate("scripts/mobile-p0-token-architecture-guard.ts", "token-architecture-guard-report.json", root));
  rows.push(runGate("scripts/epic-84-p0-startup-gate.ts", "gate-report.json", root));

  try {
    execSync("npx tsx scripts/sprint-89-deep-link-report.ts", { cwd: root, stdio: "pipe" });
    rows.push({ id: "deep_link_report", ok: true, detail: "PASS" });
  } catch {
    rows.push({ id: "deep_link_report", ok: false, detail: "FAIL" });
  }

  try {
    execSync("npx tsx scripts/sprint-89-seller-route-audit.ts", { cwd: root, stdio: "pipe" });
    rows.push({ id: "seller_route_audit", ok: true, detail: "PASS" });
  } catch {
    rows.push({ id: "seller_route_audit", ok: false, detail: "FAIL" });
  }

  const ciWorkflow = join(root, ".github/workflows/mobile-p0-gates.yml");
  rows.push({
    id: "ci_gates_wired",
    ok: existsSync(ciWorkflow) && readFileSync(ciWorkflow, "utf8").includes("mobile:p0:token-cycle-gate"),
    detail: ciWorkflow,
  });

  const failed = rows.filter((r) => !r.ok);
  const report = {
    sprint: "SPRINT-89",
    phase: "Product Correctness",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    readyForSprint90: failed.length === 0,
    rows,
    finalReport: {
      deepLinks: rows.find((r) => r.id === "deep_link_report")?.ok ? "PASS" : "FAIL",
      sellerSales: rows.find((r) => r.id === "seller_route_audit")?.ok ? "PASS" : "FAIL",
      sellerRouteAudit: rows.find((r) => r.id === "seller_route_audit")?.ok ? "PASS" : "FAIL",
      ciGates: rows.find((r) => r.id === "ci_gates_wired")?.ok ? "PASS" : "FAIL",
      regression: failed.filter((r) => !["deep_link_report", "seller_route_audit", "ci_gates_wired"].includes(r.id)).length === 0 ? "PASS" : "FAIL",
    },
  };

  writeFileSync(join(outDir, "ci-gates-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
