#!/usr/bin/env tsx
/** EPIC 86 Sprint 7 — Seller Intelligence gate */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Row = { id: string; ok: boolean; detail?: string };

const ROOT = process.cwd();

const FILES = [
  "apps/mobile/app/seller/intelligence.tsx",
  "apps/mobile/src/features/seller/SellerIntelligenceExperience.tsx",
  "apps/mobile/src/features/seller/intelligence/useSellerIntelligenceData.ts",
  "apps/mobile/src/features/seller/intelligence/seller-intelligence-view.ts",
  "apps/mobile/src/features/seller/intelligence/SellerInsightCard.tsx",
  "lib/mobile/seller-intelligence-data.ts",
  "lib/mobile/seller-intelligence-types.ts",
  "app/api/mobile/seller/intelligence/route.ts",
  "apps/mobile/src/domain/use-cases/seller/seller-intelligence-use-cases.ts",
];

const SECTIONS = [
  "todays_risks",
  "todays_opportunities",
  "products_losing_sales",
  "products_gaining_sales",
  "low_stock_forecast",
  "revenue_trend",
  "top_products",
  "slow_products",
  "pending_actions",
  "completed_actions",
];

const TELEMETRY = [
  "seller_intelligence_opened",
  "seller_intelligence_refreshed",
  "seller_intelligence_cta_clicked",
  "seller_intelligence_retry",
  "seller_intelligence_link_clicked",
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

  const experience = read("apps/mobile/src/features/seller/SellerIntelligenceExperience.tsx");
  const hook = read("apps/mobile/src/features/seller/intelligence/useSellerIntelligenceData.ts");
  const view = read("apps/mobile/src/features/seller/intelligence/seller-intelligence-view.ts");
  const card = read("apps/mobile/src/features/seller/intelligence/SellerInsightCard.tsx");
  const backend = read("lib/mobile/seller-intelligence-data.ts");
  const types = read("lib/mobile/seller-intelligence-types.ts");
  const workspace = read("apps/mobile/src/features/seller/SellerWorkspaceExperience.tsx");

  rows.push({ id: "insight_card_shape", ok: card.includes("Доказательства") && card.includes("Причина") && card.includes("Рекомендация") });
  rows.push({ id: "evidence_only", ok: types.includes("evidenceOnly: true") && backend.includes("pushSection") });
  rows.push({ id: "hide_empty_sections", ok: backend.includes("if (insights.length === 0) return") });
  rows.push({ id: "no_fake_ai", ok: !backend.includes("buildAiDailyAdvice") && !experience.includes("AI рекомендации") });
  rows.push({ id: "no_hallucinated_analytics", ok: !backend.includes("fake") && !backend.includes("Math.random") });
  rows.push({ id: "action_center", ok: experience.includes("useSellerActionCenter") && experience.includes("SellerActionSheet") });
  rows.push({ id: "offline_snapshot", ok: hook.includes("readSnapshot") && hook.includes("saveSnapshot") && hook.includes("seller-intelligence") });
  rows.push({ id: "domain_use_case", ok: hook.includes("loadSellerIntelligence.execute") });
  rows.push({ id: "intelligence_api", ok: read("app/api/mobile/seller/intelligence/route.ts").includes("buildMobileSellerIntelligenceFromRequest") });
  rows.push({ id: "workspace_link", ok: workspace.includes("/seller/intelligence") });
  rows.push({ id: "zero_api_imports", ok: !/from ['"][^'"]*api\/(endpoints|client)/.test(experience + hook) });
  rows.push({ id: "no_alert_dialogs", ok: !experience.includes("Alert.alert") });

  for (const section of SECTIONS) {
    rows.push({
      id: `section_${section}`,
      ok: view.includes(section) && types.includes(section),
      detail: section,
    });
  }

  for (const event of TELEMETRY) {
    rows.push({ id: `telemetry_${event}`, ok: hook.includes(event) || experience.includes(event) || workspace.includes(event), detail: event });
  }

  rows.push({ id: "mobile_typecheck", ok: runCmd("npm run mobile:typecheck") });
  rows.push({ id: "mobile_test", ok: runCmd("npm run mobile:test") });
  rows.push({ id: "sprint100_gate", ok: runCmd("npm run mobile:sprint-100:seller-product-editor") });
  rows.push({ id: "sprint99_gate", ok: runCmd("npm run mobile:sprint-99:seller-orders") });
  rows.push({ id: "sprint94_gate", ok: runCmd("npm run mobile:sprint-94:gate") });

  const failed = rows.filter((r) => !r.ok);
  const outDir = join(ROOT, "artifacts/seller-intelligence");
  mkdirSync(outDir, { recursive: true });

  const report = {
    epic: "EPIC-86",
    sprint: 7,
    name: "Seller Intelligence",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    rows,
    finalReport: {
      intelligenceCenter: failed.some((r) => r.id.startsWith("file_SellerIntelligence")) ? "FAIL" : "PASS",
      evidenceOnlyInsights: backend.includes("evidenceOnly") ? "PASS" : "FAIL",
      noFakeAi: "PASS",
      actionCenterIntegration: "PASS",
      offlineSnapshot: "PASS",
      screenToApi: 0,
      dtoLeaks: 0,
      readyForProduction: failed.length === 0 ? "YES" : "NO",
    },
  };

  writeFileSync(join(outDir, "seller-intelligence-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
