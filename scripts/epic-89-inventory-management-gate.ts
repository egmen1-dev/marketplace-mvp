#!/usr/bin/env tsx
/** EPIC 89 — Inventory Management Platform gate (backend) */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Row = { id: string; ok: boolean; detail?: string };

const ROOT = process.cwd();

const FILES = [
  "lib/seller-inventory-center/types.ts",
  "lib/seller-inventory-center/sections.ts",
  "lib/seller-inventory-center/stock.ts",
  "lib/seller-inventory-center/history.ts",
  "lib/seller-inventory-center/adjustments.ts",
  "lib/seller-inventory-center/queries.ts",
  "lib/mobile/seller-inventory-data.ts",
  "lib/mobile/seller-inventory-types.ts",
  "app/api/mobile/seller/inventory/route.ts",
  "app/api/mobile/seller/inventory/stock/route.ts",
  "app/api/mobile/seller/inventory/low-stock/route.ts",
  "app/api/mobile/seller/inventory/out-of-stock/route.ts",
  "app/api/mobile/seller/inventory/history/route.ts",
  "app/api/mobile/seller/inventory/adjustments/route.ts",
  "app/api/mobile/seller/inventory/[productId]/route.ts",
];

const SECTIONS = ["current_stock", "low_stock", "out_of_stock", "history", "adjustments"];
const HIDDEN = ["incoming", "reserved", "movements", "warehouses", "thresholds"];
const TELEMETRY = [
  "inventory_opened",
  "stock_updated",
  "stock_adjusted",
  "inventory_filtered",
  "inventory_searched",
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
  const sections = read("lib/seller-inventory-center/sections.ts");
  const backend = read("lib/mobile/seller-inventory-data.ts");
  const stock = read("lib/seller-inventory-center/stock.ts");
  const adjustments = read("lib/seller-inventory-center/adjustments.ts");

  rows.push({ id: "prisma_inventory_model", ok: schema.includes("model ProductInventory") });
  rows.push({ id: "prisma_history_model", ok: schema.includes("model InventoryHistory") });
  rows.push({ id: "hide_unsupported", ok: sections.includes("NOT_SUPPORTED") });
  rows.push({
    id: "no_fake_inventory",
    ok: !backend.includes("fake") && read("lib/seller-inventory-center/queries.ts").includes("productInventory"),
  });
  rows.push({ id: "pagination", ok: stock.includes("nextCursor") && stock.includes("hasMore") });
  rows.push({ id: "search_filter_sort", ok: stock.includes("query") && stock.includes("filter") && stock.includes("sort") });
  rows.push({ id: "batch_adjust", ok: adjustments.includes("batchAdjustSellerInventory") });
  rows.push({ id: "offline_cache_contract", ok: backend.includes("cacheVersion") && backend.includes("retryAfterMs") });
  rows.push({ id: "history_read_api", ok: existsSync(join(ROOT, "app/api/mobile/seller/inventory/history/route.ts")) });
  rows.push({ id: "quick_stock_edit", ok: existsSync(join(ROOT, "app/api/mobile/seller/inventory/[productId]/route.ts")) });

  for (const section of SECTIONS) {
    rows.push({ id: `section_${section}`, ok: sections.includes(section), detail: section });
  }
  for (const section of HIDDEN) {
    rows.push({
      id: `hidden_${section}`,
      ok: sections.includes(`id: "${section}"`) && sections.includes("supported: false"),
      detail: section,
    });
  }
  for (const event of TELEMETRY) {
    rows.push({
      id: `telemetry_${event}`,
      ok: backend.includes(event) || read("lib/mobile/seller-inventory-types.ts").includes(event),
      detail: event,
    });
  }

  rows.push({ id: "inventory_tests", ok: runCmd("npx vitest run tests/seller-inventory-center.test.ts tests/seller-center.test.ts tests/payments-inventory.test.ts") });
  rows.push({ id: "inventory_regression", ok: runCmd("npx vitest run tests/payments-inventory.test.ts") });
  rows.push({ id: "build", ok: runCmd("npm run build") });

  const failed = rows.filter((r) => !r.ok);
  const outDir = join(ROOT, "artifacts/epic-89-inventory-management");
  mkdirSync(outDir, { recursive: true });

  const report = {
    epic: "EPIC-89",
    name: "Inventory Management Platform",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    rows,
    finalReport: {
      inventory: failed.some((r) => r.id.startsWith("file_") || r.id === "prisma_inventory_model") ? "FAIL" : "PASS",
      lowStock: sections.includes("low_stock") ? "PASS" : "FAIL",
      history: sections.includes("history") ? "PASS" : "FAIL",
      performance: failed.some((r) => r.id === "pagination" || r.id === "build") ? "FAIL" : "PASS",
      regression: failed.some((r) => r.id.includes("regression") || r.id === "inventory_tests") ? "FAIL" : "PASS",
      ready: failed.length === 0 ? "YES" : "NO",
    },
  };

  writeFileSync(join(outDir, "gate-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
