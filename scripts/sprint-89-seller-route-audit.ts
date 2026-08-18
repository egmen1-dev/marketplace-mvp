#!/usr/bin/env tsx
/** Sprint 89 — seller route audit: detect buyer API imports in seller tab screens */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

type Finding = { file: string; rule: string; detail: string };

const ROOT = process.cwd();
const MOBILE = join(ROOT, "apps/mobile");
const SELLER_ONLY_ROUTES = [
  "app/(tabs)/seller-home.tsx",
  "app/(tabs)/seller-products.tsx",
  "app/(tabs)/seller-sales.tsx",
];

const SHARED_SELLER_ROUTES = ["app/(tabs)/wallet.tsx", "app/(tabs)/profile.tsx"];

const BUYER_API_PATTERNS: Array<{ id: string; pattern: RegExp; allowIn?: string[] }> = [
  { id: "buyer_fetch_orders", pattern: /\bfetchOrders\b/ },
  { id: "buyer_use_orders_data", pattern: /\buseOrdersData\b/ },
  { id: "buyer_orders_experience", pattern: /\bOrdersExperience\b/ },
  { id: "buyer_fetch_buyer_home", pattern: /\bfetchBuyerHome\b/ },
];

const BUYER_IMPORT_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: "buyer_orders_feature", pattern: /from ["'].*features\/orders/ },
];

function auditFile(relPath: string): Finding[] {
  const abs = join(MOBILE, relPath);
  const source = readFileSync(abs, "utf8");
  const findings: Finding[] = [];

  for (const rule of BUYER_API_PATTERNS) {
    if (rule.pattern.test(source)) {
      findings.push({ file: relPath, rule: rule.id, detail: rule.pattern.source });
    }
  }
  for (const rule of BUYER_IMPORT_PATTERNS) {
    if (rule.pattern.test(source)) {
      findings.push({ file: relPath, rule: rule.id, detail: "buyer orders feature import" });
    }
  }

  if (relPath === "app/(tabs)/seller-sales.tsx") {
    if (/from ["']\.\/orders["']/.test(source) || /\bOrdersScreen\b/.test(source)) {
      findings.push({ file: relPath, rule: "seller_sales_reexport_buyer", detail: "re-exports buyer orders screen" });
    }
    if (!/useSellerSalesData|SellerSalesExperience|fetchSellerOrders/.test(source)) {
      findings.push({ file: relPath, rule: "seller_sales_missing_seller_hook", detail: "seller sales hook not used" });
    }
  }

  return findings;
}

function main() {
  const findings: Finding[] = [];
  const watch: Finding[] = [];

  for (const route of SELLER_ONLY_ROUTES) {
    findings.push(...auditFile(route));
  }

  for (const route of SHARED_SELLER_ROUTES) {
    watch.push(...auditFile(route));
  }

  const sellerFeatureDir = join(MOBILE, "src/features/seller-sales");
  const sellerFeatureFiles = readdirSync(sellerFeatureDir).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
  for (const file of sellerFeatureFiles) {
    const rel = relative(MOBILE, join(sellerFeatureDir, file));
    const source = readFileSync(join(sellerFeatureDir, file), "utf8");
    if (/\bfetchOrders\b|\buseOrdersData\b|\bOrdersExperience\b/.test(source)) {
      findings.push({ file: rel, rule: "buyer_api_in_seller_feature", detail: "buyer orders API in seller-sales feature" });
    }
  }

  const report = {
    sprint: "SPRINT-89",
    generatedAt: new Date().toISOString(),
    verdict: findings.length === 0 ? "PASS" : "FAIL",
    routes: [...SELLER_ONLY_ROUTES, ...SHARED_SELLER_ROUTES],
    findings,
    watchFindings: watch,
    notes: {
      seller_orders: "seller-sales tab (no separate seller-orders route in Expo app)",
      seller_settings: "not implemented in Closed Alpha 0.1.5",
      wallet_shared_tab: "wallet uses fetchSellerOrders in seller mode",
    },
  };

  const outDir = join(ROOT, "artifacts/sprint-89-product-correctness");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "seller-route-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (findings.length > 0) process.exit(1);
}

main();
