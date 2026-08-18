#!/usr/bin/env tsx
/** EPIC 88 — Seller Promotion Center gate (backend) */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Row = { id: string; ok: boolean; detail?: string };

const ROOT = process.cwd();

const FILES = [
  "lib/seller-promotion-center/types.ts",
  "lib/seller-promotion-center/sections.ts",
  "lib/seller-promotion-center/campaigns.ts",
  "lib/seller-promotion-center/discounts.ts",
  "lib/seller-promotion-center/history.ts",
  "lib/seller-promotion-center/performance.ts",
  "lib/seller-promotion-center/featured.ts",
  "lib/seller-promotion-center/eligibility.ts",
  "lib/mobile/seller-promotion-data.ts",
  "lib/mobile/seller-promotion-types.ts",
  "app/api/mobile/seller/promotion/route.ts",
  "app/api/mobile/seller/promotion/campaigns/route.ts",
  "app/api/mobile/seller/promotion/campaigns/[id]/route.ts",
  "app/api/mobile/seller/promotion/discounts/route.ts",
  "app/api/mobile/seller/promotion/history/route.ts",
  "app/api/mobile/seller/promotion/performance/route.ts",
  "app/api/mobile/seller/promotion/eligibility/route.ts",
];

const SECTIONS = ["discounts", "campaigns", "featured", "history", "performance", "eligibility"];
const HIDDEN_SECTIONS = ["coupons", "bundles"];
const TELEMETRY = [
  "promotion_opened",
  "promotion_created",
  "promotion_updated",
  "promotion_deleted",
  "promotion_published",
  "promotion_finished",
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

  const schema = read("prisma/schema.prisma");
  const sections = read("lib/seller-promotion-center/sections.ts");
  const backend = read("lib/mobile/seller-promotion-data.ts");
  const queries = read("lib/seller-promotion-center/queries.ts");
  const actions = read("lib/seller-promotion-center/actions.ts");

  rows.push({ id: "prisma_campaign_model", ok: schema.includes("model PromotionCampaign") });
  rows.push({ id: "prisma_order_model", ok: schema.includes("model PromotionOrder") });
  rows.push({ id: "hide_unsupported", ok: sections.includes('supported: false') && sections.includes("NOT_SUPPORTED") });
  rows.push({ id: "no_fake_marketing", ok: !backend.includes("fake") && queries.includes("promotionCampaign.count") });
  rows.push({ id: "campaign_lifecycle", ok: actions.includes("activatePromotionPurchase") });
  rows.push({ id: "offline_cache_contract", ok: backend.includes("cacheVersion") && backend.includes("retryAfterMs") });
  rows.push({ id: "publish_api", ok: read("app/api/mobile/seller/promotion/campaigns/route.ts").includes("POST") });
  rows.push({ id: "detail_api", ok: existsSync(join(ROOT, "app/api/mobile/seller/promotion/campaigns/[id]/route.ts")) });

  for (const section of SECTIONS) {
    rows.push({ id: `section_${section}`, ok: sections.includes(section), detail: section });
  }
  for (const section of HIDDEN_SECTIONS) {
    rows.push({
      id: `hidden_${section}`,
      ok: sections.includes(`id: "${section}"`) && sections.includes("supported: false"),
      detail: section,
    });
  }
  for (const event of TELEMETRY) {
    rows.push({
      id: `telemetry_${event}`,
      ok: backend.includes(event) || read("lib/mobile/seller-promotion-types.ts").includes(event),
      detail: event,
    });
  }

  rows.push({ id: "promotion_tests", ok: runCmd("npx vitest run tests/seller-promotion-center.test.ts tests/promotion-wallet-payment.test.ts") });
  rows.push({ id: "promotion_wallet_regression", ok: runCmd("npx vitest run tests/promotion-wallet-payment.test.ts") });
  rows.push({ id: "build", ok: runCmd("npm run build") });

  const failed = rows.filter((r) => !r.ok);
  const campaignCount = (sections.match(/id: "campaigns"/g) ?? []).length;
  const discountCount = (sections.match(/id: "discounts"/g) ?? []).length;
  const outDir = join(ROOT, "artifacts/epic-88-promotion-center");
  mkdirSync(outDir, { recursive: true });

  const report = {
    epic: "EPIC-88",
    name: "Seller Promotion Center",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    rows,
    finalReport: {
      promotionCenter: failed.some((r) => r.id.startsWith("file_")) ? "FAIL" : "PASS",
      campaigns: campaignCount,
      discountTypes: discountCount,
      backendSupport: failed.some((r) => r.id.includes("prisma") || r.id === "campaign_lifecycle") ? "FAIL" : "PASS",
      regression: failed.some((r) => r.id.includes("regression") || r.id === "promotion_tests") ? "FAIL" : "PASS",
      ready: failed.length === 0 ? "YES" : "NO",
    },
  };

  writeFileSync(join(outDir, "gate-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
