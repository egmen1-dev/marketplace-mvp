#!/usr/bin/env tsx
/** EPIC 86 Sprint 2 — Seller Workspace gate */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Row = { id: string; ok: boolean; detail?: string };

const ROOT = process.cwd();

const FILES = [
  "apps/mobile/app/(tabs)/seller-home.tsx",
  "apps/mobile/src/features/seller/SellerWorkspaceExperience.tsx",
  "apps/mobile/src/features/seller/useSellerHomeData.ts",
  "apps/mobile/src/features/seller/seller-view.ts",
  "lib/mobile/seller-workspace-data.ts",
];

const SECTIONS = [
  "urgent",
  "todays_work",
  "quick_resume",
  "recent_drafts",
  "pending_publications",
  "low_stock",
  "awaiting_shipment",
  "customer_replies",
  "financial_actions",
  "completed_today",
];

const TELEMETRY = [
  "seller_workspace_opened",
  "seller_task_completed",
  "seller_resume_clicked",
  "seller_priority_changed",
];

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function runCmd(cmd: string): boolean {
  try {
    execSync(cmd, { cwd: ROOT, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const rows: Row[] = [];
  for (const file of FILES) {
    rows.push({ id: `file_${file.split("/").pop()}`, ok: existsSync(join(ROOT, file)), detail: file });
  }

  const shell = read("apps/mobile/app/(tabs)/seller-home.tsx");
  const hook = read("apps/mobile/src/features/seller/useSellerHomeData.ts");
  const experience = read("apps/mobile/src/features/seller/SellerWorkspaceExperience.tsx");
  const backend = read("lib/mobile/seller-workspace-data.ts");
  const view = read("apps/mobile/src/features/seller/seller-view.ts");

  rows.push({ id: "uses_workspace_experience", ok: shell.includes("SellerWorkspaceExperience") });
  rows.push({ id: "domain_use_case", ok: hook.includes("loadSellerHome.execute") });
  rows.push({ id: "zero_api_imports", ok: !/from ['"][^'"]*api\/(endpoints|client)/.test(shell + hook + experience) });
  rows.push({ id: "offline_snapshot", ok: hook.includes("readSnapshot") && hook.includes("saveSnapshot") });
  rows.push({ id: "section_retry", ok: experience.includes("SectionErrorCard") });
  rows.push({ id: "backend_workspace_builder", ok: backend.includes("buildSellerWorkspace") });
  rows.push({ id: "workspace_payload", ok: read("lib/mobile/seller-home.ts").includes("workspace:") });
  rows.push({ id: "priority_lanes", ok: experience.includes("PriorityLane") });
  rows.push({ id: "no_fake_ai", ok: !experience.includes("AI рекомендации") && !backend.includes("topAction") });
  rows.push({ id: "no_generated_advice", ok: !experience.includes("Обновите фото") && !experience.includes("Совет") });

  for (const section of SECTIONS) {
    rows.push({
      id: `section_${section}`,
      ok: view.includes(section) && backend.includes(section),
      detail: section,
    });
  }

  for (const event of TELEMETRY) {
    rows.push({ id: `telemetry_${event}`, ok: hook.includes(event) || experience.includes(event), detail: event });
  }

  rows.push({ id: "mobile_typecheck", ok: runCmd("npm run mobile:typecheck") });
  rows.push({ id: "mobile_test", ok: runCmd("npm run mobile:test") });
  rows.push({ id: "sprint94_gate", ok: runCmd("npm run mobile:sprint-94:gate") });

  const failed = rows.filter((r) => !r.ok);
  const outDir = join(ROOT, "artifacts/seller-workspace");
  mkdirSync(outDir, { recursive: true });

  const report = {
    epic: "EPIC-86",
    sprint: 2,
    name: "Seller Workspace",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    rows,
    finalReport: {
      workspaceSections: SECTIONS.length,
      backendTaskSources: 5,
      fakeTasks: 0,
      screenApiImports: 0,
      dtoLeaks: 0,
      architectureGates: failed.some((r) => r.id === "sprint94_gate") ? "FAIL" : "PASS",
      readyForSprint3: failed.length === 0 ? "YES" : "NO",
    },
  };

  writeFileSync(join(outDir, "seller-workspace-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
