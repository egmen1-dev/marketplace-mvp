#!/usr/bin/env tsx
/**
 * EPIC-88 — Commerce Foundation Hardening release checklist gate
 *
 * Runs all automatable gates from docs/mobile/EPIC_88_RELEASE_CHECKLIST.md
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { mobilePaths, repoRoot } from "./mobile-p0-gate-lib";

type Row = { id: string; ok: boolean; detail?: string; blocking?: boolean };

function run(cmd: string, cwd: string): { ok: boolean; detail: string } {
  try {
    execSync(cmd, { cwd, stdio: "pipe", maxBuffer: 20 * 1024 * 1024 });
    return { ok: true, detail: cmd };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

function runGate(
  id: string,
  script: string,
  reportFile: string,
  cwd: string,
  blocking = true,
  reportDir?: string,
): Row {
  try {
    execSync(`npx tsx ${script}`, { cwd, stdio: "pipe", maxBuffer: 20 * 1024 * 1024 });
  } catch {
    /* gate scripts exit 1 on FAIL — read report below */
  }
  const candidates = [
    reportDir ? join(cwd, reportDir, reportFile) : join(mobilePaths(cwd).artifacts, reportFile),
    join(mobilePaths(cwd).artifacts, reportFile),
    join(cwd, "artifacts/epic-88", reportFile),
    join(cwd, "artifacts", reportFile),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (path) {
    const report = JSON.parse(readFileSync(path, "utf8")) as { verdict?: string; status?: string };
    const pass = report.verdict === "PASS" || report.status === "PASS";
    return { id, ok: pass, detail: `${report.verdict ?? report.status ?? "unknown"} (${path})`, blocking };
  }
  return { id, ok: false, detail: `${script} — report not found (${reportFile})`, blocking };
}

function main() {
  const root = repoRoot();
  const rows: Row[] = [];

  const docs = [
    "docs/product/EPIC_88_COMMERCE_FOUNDATION_HARDENING.md",
    "docs/mobile/EPIC_88_RELEASE_CHECKLIST.md",
    "docs/product/EPIC_88_TECHNICAL_DEBT_BACKLOG.md",
  ];
  for (const doc of docs) {
    rows.push({
      id: `doc_${doc.split("/").pop()?.replace(".md", "")}`,
      ok: existsSync(join(root, doc)),
      detail: doc,
      blocking: true,
    });
  }

  rows.push({ ...run("npm run mobile:typecheck", root), id: "typecheck", blocking: true });
  rows.push({ ...run("npm run mobile:test", root), id: "tests", blocking: true });

  const gateScripts: Array<{
    id: string;
    script: string;
    report: string;
    reportDir?: string;
    blocking?: boolean;
  }> = [
    { id: "expo_dependency_gate", script: "scripts/mobile-p0-expo-deps-gate.ts", report: "expo-deps-gate-report.json" },
    { id: "route_graph_gate", script: "scripts/mobile-p0-route-graph-gate.ts", report: "route-graph-gate-report.json" },
    {
      id: "token_architecture_gate",
      script: "scripts/mobile-p0-token-architecture-guard.ts",
      report: "token-architecture-guard-report.json",
    },
    { id: "cycle_gate", script: "scripts/mobile-p0-token-cycle-gate.ts", report: "token-cycle-gate-report.json" },
    { id: "startup_gate", script: "scripts/epic-84-p0-startup-gate.ts", report: "gate-report.json" },
    { id: "design_gate", script: "scripts/epic-84-wave-0-design-audit.ts", report: "design-audit-gate.json", reportDir: "artifacts/epic-84-wave-0" },
  ];
  for (const gate of gateScripts) {
    rows.push(runGate(gate.id, gate.script, gate.report, root, gate.blocking ?? true, gate.reportDir));
  }

  // Release platform gates (may WATCH in cloud without full manifest state)
  const platformGates = [
    { id: "closed_alpha_gate", cmd: "npm run mobile:closed-alpha:gate" },
    { id: "minimum_supported_gate", cmd: "npm run mobile:epic-83:gate" },
  ];
  for (const gate of platformGates) {
    const result = run(gate.cmd, root);
    rows.push({ id: gate.id, ok: result.ok, detail: result.detail, blocking: false });
  }

  const watchGates = [
    { id: "release_smoke", cmd: "npm run mobile:release-smoke" },
    { id: "bytecode_guard", script: "scripts/mobile-p0-bytecode-guard.ts", report: "bytecode-guard-report.json" },
  ];
  for (const gate of watchGates) {
    if ("script" in gate && gate.script) {
      rows.push(runGate(gate.id, gate.script, gate.report!, root, false));
    } else {
      rows.push({ ...run(gate.cmd!, root), id: gate.id, blocking: false });
    }
  }

  const ftlReport = join(mobilePaths(root).artifacts, "firebase-test-lab-report.json");
  let ftlStatus = "NOT_RUN";
  if (existsSync(ftlReport)) {
    const ftl = JSON.parse(readFileSync(ftlReport, "utf8")) as { status?: string; verdict?: string };
    ftlStatus = ftl.status ?? ftl.verdict ?? "UNKNOWN";
  }
  rows.push({ id: "firebase_test_lab", ok: ftlStatus === "PASS", detail: ftlStatus, blocking: false });

  const blockingFailed = rows.filter((r) => r.blocking !== false && !r.ok);
  const watchFailed = rows.filter((r) => r.blocking === false && !r.ok);

  let verdict: "GO" | "WATCH" | "NO-GO";
  if (blockingFailed.length > 0) {
    verdict = "NO-GO";
  } else if (watchFailed.length > 0 || ftlStatus !== "PASS") {
    verdict = "WATCH";
  } else {
    verdict = "GO";
  }

  const report = {
    epic: "EPIC-88",
    phase: "Commerce Foundation Hardening · Release Checklist",
    generatedAt: new Date().toISOString(),
    verdict,
    blockingFailed: blockingFailed.map((r) => r.id),
    watchFailed: watchFailed.map((r) => r.id),
    ftlStatus,
    rows,
    checklist: "docs/mobile/EPIC_88_RELEASE_CHECKLIST.md",
    audit: "docs/product/EPIC_88_COMMERCE_FOUNDATION_HARDENING.md",
    backlog: "docs/product/EPIC_88_TECHNICAL_DEBT_BACKLOG.md",
  };

  const outDir = join(root, "artifacts/epic-88");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "release-checklist-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (verdict === "NO-GO") {
    process.exit(1);
  }
}

main();
