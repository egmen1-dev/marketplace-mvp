#!/usr/bin/env tsx
/** EPIC-84 — Marketplace Productization gate (POP release verdict + Wave 0 docs) */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildProductReleaseVerdictReport } from "@/lib/product-operations/release/verdict";

type Row = { id: string; ok: boolean; detail?: string };

async function main() {
  const rows: Row[] = [];

  const docs = [
    "docs/product/EPIC_84_MARKETPLACE_PRODUCTIZATION.md",
    "docs/product/EPIC_84_WAVE_0_DESIGN_SYSTEM.md",
    "docs/product/EPIC_84_WAVE_0_UX_AUDIT.md",
    "apps/mobile/src/design-system/index.ts",
  ];
  for (const doc of docs) {
    rows.push({ id: `doc_${doc.split("/").pop()}`, ok: existsSync(join(process.cwd(), doc)), detail: doc });
  }

  rows.push({
    id: "release_verdict_module",
    ok: existsSync(join(process.cwd(), "lib/product-operations/release/verdict.ts")),
  });

  rows.push({
    id: "release_verdict_api",
    ok: existsSync(join(process.cwd(), "app/api/admin/product-ops/release-verdict/route.ts")),
  });

  rows.push({
    id: "seller_journey_funnel",
    ok: existsSync(join(process.cwd(), "lib/product-operations/sessions/index.ts")),
    detail: "getSellerJourneyFunnel",
  });

  rows.push({
    id: "marketplace_quality_module",
    ok: existsSync(join(process.cwd(), "lib/product-operations/marketplace-quality/report.ts")),
  });

  rows.push({
    id: "marketplace_quality_api",
    ok: existsSync(join(process.cwd(), "app/api/admin/product-ops/marketplace-quality/route.ts")),
  });

  try {
    execSync("npm run product:epic-84:wave0", { stdio: "pipe" });
    rows.push({ id: "wave0_design_audit_gate", ok: true });
  } catch {
    rows.push({ id: "wave0_design_audit_gate", ok: false });
  }

  const p0Count = Number(process.env.EPIC84_P0_COUNT ?? "0");
  const physicalPass = process.env.PHYSICAL_ANDROID_PASS === "true";

  let verdictReport;
  try {
    verdictReport = await buildProductReleaseVerdictReport({ p0Count, physicalPass });
    rows.push({
      id: "pop_release_verdict",
      ok: ["GO", "WATCH", "NO-GO"].includes(verdictReport.verdict),
      detail: verdictReport.verdict,
    });
    rows.push({
      id: "pop_metrics_pack",
      ok: typeof verdictReport.metrics.dau === "number" && typeof verdictReport.metrics.crashFreeRate === "number",
      detail: `dau=${verdictReport.metrics.dau} crashFree=${verdictReport.metrics.crashFreeRate}%`,
    });
  } catch (err) {
    rows.push({ id: "pop_release_verdict", ok: false, detail: String(err) });
  }

  const failed = rows.filter((r) => !r.ok);
  const report = {
    epic: "EPIC-84",
    phase: "Marketplace Productization · Wave 0",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    productReleaseVerdict: verdictReport?.verdict ?? "UNKNOWN",
    rows,
    releaseDeliverables: {
      metricsPack: verdictReport?.metrics ?? null,
      automaticVerdict: verdictReport?.verdict ?? null,
      reasons: verdictReport?.reasons ?? [],
    },
  };

  const outDir = join(process.cwd(), "artifacts/epic-84-productization");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "gate-report.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
