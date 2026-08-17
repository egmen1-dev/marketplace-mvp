#!/usr/bin/env tsx
/** EPIC-84 Sprint 2 — Buyer Home Experience gate */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  computeMarketplaceFeeling,
  computeMarketplaceScore,
} from "@/lib/product-operations/marketplace-quality/criteria";
import { detectCrudInSource } from "@/lib/product-operations/marketplace-quality/crud-detection";
import { enrichAuditFile, loadMarketplaceQualityAudit, saveMarketplaceQualityAudit } from "@/lib/product-operations/marketplace-quality/report";

type Row = { id: string; ok: boolean; detail?: string };

const HOME_FILES = [
  "apps/mobile/app/(tabs)/index.tsx",
  "apps/mobile/src/features/buyer-home/BuyerHomeExperience.tsx",
  "apps/mobile/src/features/buyer-home/useBuyerHomeData.ts",
];

const DESIGN_COMPONENTS = [
  "apps/mobile/src/design-system/components/CommerceSectionHeader.tsx",
  "apps/mobile/src/design-system/components/BuyerHomeHeader.tsx",
  "apps/mobile/src/design-system/components/CategoryRail.tsx",
];

function main() {
  const rows: Row[] = [];
  const root = process.cwd();

  for (const file of [...HOME_FILES, ...DESIGN_COMPONENTS]) {
    rows.push({ id: `file_${file.split("/").pop()}`, ok: existsSync(join(root, file)), detail: file });
  }

  const indexSource = readFileSync(join(root, "apps/mobile/app/(tabs)/index.tsx"), "utf8");
  const experienceSource = readFileSync(join(root, "apps/mobile/src/features/buyer-home/BuyerHomeExperience.tsx"), "utf8");

  rows.push({ id: "uses_buyer_home_experience", ok: indexSource.includes("BuyerHomeExperience") });
  rows.push({ id: "no_fake_dlya_vas", ok: !experienceSource.includes("Для вас") });
  rows.push({ id: "honest_recommend_title", ok: experienceSource.includes("Рекомендуем посмотреть") });
  rows.push({ id: "commerce_section_header", ok: experienceSource.includes("CommerceSectionHeader") });
  rows.push({ id: "pull_to_refresh", ok: experienceSource.includes("RefreshControl") });
  rows.push({ id: "section_error_partial", ok: experienceSource.includes("SectionErrorCard") });
  rows.push({ id: "hide_empty_recent", ok: experienceSource.includes("hideWhenEmpty") });
  rows.push({ id: "cart_header_entry", ok: experienceSource.includes("BuyerHomeHeader") });

  for (const file of HOME_FILES) {
    const crud = detectCrudInSource(file);
    rows.push({ id: `crud_${file.split("/").pop()}`, ok: !crud.fail, detail: crud.signals.map((s) => s.pattern).join(",") || "PASS" });
  }

  const audit = enrichAuditFile(loadMarketplaceQualityAudit());
  const home = audit.screens.find((s) => s.screenId === "buyer_home");
  if (!home?.scoresAfter) {
    rows.push({ id: "buyer_home_scores_after", ok: false, detail: "missing scoresAfter" });
  } else {
    const score = computeMarketplaceScore(home.scoresAfter);
    const feeling = computeMarketplaceFeeling(home.scoresAfter);
    const before = home.marketplaceScoreBefore ?? 0;
    const delta = score !== null ? Math.round((score - before) * 100) / 100 : null;
    rows.push({ id: "buyer_home_marketplace_score", ok: score !== null && score >= 9.0, detail: String(score) });
    rows.push({ id: "buyer_home_marketplace_feeling", ok: feeling !== null && feeling >= 9.4, detail: String(feeling) });
    rows.push({ id: "buyer_home_score_delta", ok: delta !== null && delta >= 2.0, detail: String(delta) });
    rows.push({ id: "buyer_home_p0", ok: home.issues.filter((i) => i.priority === "P0").length === 0 });
    rows.push({ id: "buyer_home_p1", ok: home.issues.filter((i) => i.priority === "P1").length === 0 });
  }

  saveMarketplaceQualityAudit(audit);

  const failed = rows.filter((r) => !r.ok);
  const report = { epic: "EPIC-84", sprint: 2, name: "Buyer Home Experience", generatedAt: new Date().toISOString(), verdict: failed.length === 0 ? "PASS" : "FAIL", buyerHome: home ?? null, rows };

  const outDir = join(root, "artifacts/epic-84-sprint-2-buyer-home");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "sprint-gate.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
