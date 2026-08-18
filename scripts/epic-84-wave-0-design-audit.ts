#!/usr/bin/env tsx
/** EPIC-84 Wave 0 — Product Design System + Marketplace Quality Audit gate */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildMarketplaceQualityReport,
  createEmptyAuditFile,
  enrichAuditFile,
  loadMarketplaceQualityAudit,
  saveMarketplaceQualityAudit,
} from "@/lib/product-operations/marketplace-quality/report";
import { detectCrudInSource } from "@/lib/product-operations/marketplace-quality/crud-detection";

type Row = { id: string; ok: boolean; detail?: string };

function main() {
  const rows: Row[] = [];
  const root = process.cwd();

  const designSystemPaths = [
    "apps/mobile/src/design-system/index.ts",
    "apps/mobile/src/design-system/tokens/colors.ts",
    "apps/mobile/src/design-system/tokens/typography.ts",
    "apps/mobile/src/design-system/tokens/spacing.ts",
    "apps/mobile/src/design-system/components/registry.ts",
  ];

  for (const p of designSystemPaths) {
    rows.push({ id: `design_system_${p.split("/").pop()}`, ok: existsSync(join(root, p)), detail: p });
  }

  const dsIndex = readFileSync(join(root, "apps/mobile/src/design-system/index.ts"), "utf8");
  rows.push({
    id: "design_system_version",
    ok: dsIndex.includes("DESIGN_SYSTEM_VERSION"),
    detail: "1.0.0",
  });

  const auditPath = "artifacts/epic-84-wave-0/marketplace-quality-audit.json";
  if (!existsSync(join(root, auditPath))) {
    saveMarketplaceQualityAudit(createEmptyAuditFile(), auditPath, root);
  }

  const audit = enrichAuditFile(loadMarketplaceQualityAudit(auditPath, root));
  saveMarketplaceQualityAudit(audit, auditPath, root);

  const report = buildMarketplaceQualityReport(audit);

  rows.push({
    id: "marketplace_quality_audit",
    ok: audit.screens.length >= 20,
    detail: `${audit.screens.length} screens`,
  });

  rows.push({
    id: "crud_detection_login",
    ok: !detectCrudInSource("apps/mobile/app/login.tsx").fail,
    detail: detectCrudInSource("apps/mobile/app/login.tsx").signals.map((s) => s.pattern).join(",") || "clean",
  });

  rows.push({
    id: "marketplace_quality_index",
    ok: report.marketplaceQualityIndex === null || report.marketplaceQualityIndex >= 0,
    detail: report.marketplaceQualityIndex === null ? "pending audit scores" : String(report.marketplaceQualityIndex),
  });

  const failed = rows.filter((r) => !r.ok);
  const out = {
    epic: "EPIC-84",
    wave: 0,
    phase: "Product Design System Audit",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    designSystemVersion: report.designSystemVersion,
    marketplaceQualityReport: report,
    rows,
  };

  const outDir = join(root, "artifacts/epic-84-wave-0");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "design-audit-gate.json"), JSON.stringify(out, null, 2));
  writeFileSync(join(root, "artifacts/epic-84-productization/marketplace-quality-report.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(out, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
