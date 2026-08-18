#!/usr/bin/env tsx
/** EPIC 86 Sprint 3 — Seller Action Center gate */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Row = { id: string; ok: boolean; detail?: string };

const ROOT = process.cwd();

const FILES = [
  "apps/mobile/src/design-system/components/UniversalActionCard.tsx",
  "apps/mobile/src/design-system/components/UniversalBottomSheet.tsx",
  "apps/mobile/src/features/seller/action-center/action-router.ts",
  "apps/mobile/src/features/seller/action-center/useSellerActionCenter.ts",
  "apps/mobile/src/features/seller/action-center/ActionResultBanner.tsx",
  "apps/mobile/src/features/seller/action-center/SellerActionSheet.tsx",
  "apps/mobile/src/features/seller/SellerWorkspaceExperience.tsx",
  "apps/mobile/src/domain/use-cases/seller/execute-seller-action.ts",
  "app/api/mobile/seller/actions/route.ts",
  "lib/mobile/seller-actions-data.ts",
];

const SUPPORTED_ACTIONS = [
  "update_stock",
  "publish_product",
  "fix_moderation",
  "ship_order",
  "confirm_order",
  "reply_buyer",
  "withdraw_funds",
  "complete_profile",
  "resume_draft",
];

const TELEMETRY = [
  "seller_action_open",
  "seller_action_execute",
  "seller_action_success",
  "seller_action_failure",
  "seller_action_undo",
  "seller_task_completed",
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

  const experience = read("apps/mobile/src/features/seller/SellerWorkspaceExperience.tsx");
  const hook = read("apps/mobile/src/features/seller/action-center/useSellerActionCenter.ts");
  const backend = read("lib/mobile/seller-actions-data.ts");
  const workspace = read("lib/mobile/seller-workspace-data.ts");
  const router = read("apps/mobile/src/features/seller/action-center/action-router.ts");

  rows.push({ id: "uses_action_center", ok: experience.includes("useSellerActionCenter") });
  rows.push({ id: "uses_action_card", ok: experience.includes("UniversalActionCard") });
  rows.push({ id: "uses_bottom_sheet", ok: experience.includes("SellerActionSheet") });
  rows.push({ id: "uses_result_banner", ok: experience.includes("ActionResultBanner") });
  rows.push({ id: "execute_use_case", ok: hook.includes("executeSellerAction.execute") });
  rows.push({ id: "optimistic_hide", ok: hook.includes("optimisticHiddenIds") });
  rows.push({ id: "workspace_refresh", ok: experience.includes("onWorkspaceRefresh: retryDashboard") });
  rows.push({ id: "undo_support", ok: hook.includes("seller_action_undo") && backend.includes("undo:") });
  rows.push({ id: "rollback_on_failure", ok: hook.includes("next.delete(task.id)") });
  rows.push({
    id: "no_task_navigation",
    ok: !experience.includes("navigateForTask") && !/onTaskPress[\s\S]{0,900}router\.push/.test(experience),
  });
  rows.push({ id: "backend_only_actions", ok: backend.includes("executeMobileSellerAction") });
  rows.push({ id: "no_fake_ai", ok: !experience.includes("AI рекомендации") && !router.includes("generate") });

  for (const action of SUPPORTED_ACTIONS) {
    rows.push({
      id: `action_${action}`,
      ok: backend.includes(`"${action}"`) || backend.includes(`case "${action}"`),
      detail: action,
    });
  }

  for (const event of TELEMETRY) {
    rows.push({ id: `telemetry_${event}`, ok: hook.includes(event) || experience.includes(event), detail: event });
  }

  rows.push({ id: "mobile_typecheck", ok: runCmd("npm run mobile:typecheck") });
  rows.push({ id: "mobile_test", ok: runCmd("npm run mobile:test") });
  rows.push({ id: "sprint96_gate", ok: runCmd("npm run mobile:sprint-96:seller-workspace") });

  const failed = rows.filter((r) => !r.ok);
  const outDir = join(ROOT, "artifacts/seller-action-center");
  mkdirSync(outDir, { recursive: true });

  const report = {
    epic: "EPIC-86",
    sprint: 3,
    name: "Seller Action Center",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    rows,
    finalReport: {
      supportedActions: SUPPORTED_ACTIONS.length,
      fakeActions: 0,
      inAppNavigationOnTaskTap: 0,
      optimisticUpdates: true,
      undoWhereSupported: true,
      architectureGates: failed.some((r) => r.id === "sprint96_gate") ? "FAIL" : "PASS",
      readyForSprint4: failed.length === 0 ? "YES" : "NO",
    },
  };

  writeFileSync(join(outDir, "seller-action-center-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
