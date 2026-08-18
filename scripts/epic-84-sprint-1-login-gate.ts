#!/usr/bin/env tsx
/** EPIC-84 Sprint 1 — Login Experience gate */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  computeMarketplaceFeeling,
  computeMarketplaceScore,
} from "@/lib/product-operations/marketplace-quality/criteria";
import { detectCrudInSource } from "@/lib/product-operations/marketplace-quality/crud-detection";
import { enrichAuditFile, loadMarketplaceQualityAudit, saveMarketplaceQualityAudit } from "@/lib/product-operations/marketplace-quality/report";

type Row = { id: string; ok: boolean; detail?: string };

const LOGIN_FILES = [
  "apps/mobile/app/login.tsx",
  "apps/mobile/src/features/auth/LoginExperience.tsx",
];

const DESIGN_COMPONENTS = [
  "apps/mobile/src/design-system/components/TextField.tsx",
  "apps/mobile/src/design-system/components/PrimaryCTA.tsx",
  "apps/mobile/src/design-system/components/AuthErrorCard.tsx",
];

function main() {
  const rows: Row[] = [];
  const root = process.cwd();

  for (const file of [...LOGIN_FILES, ...DESIGN_COMPONENTS]) {
    rows.push({ id: `file_${file.split("/").pop()}`, ok: existsSync(join(root, file)), detail: file });
  }

  const loginSource = readFileSync(join(root, "apps/mobile/app/login.tsx"), "utf8");
  rows.push({
    id: "uses_login_experience",
    ok: loginSource.includes("LoginExperience"),
    detail: "full redesign module",
  });
  rows.push({
    id: "no_alert_dialog",
    ok: !loginSource.includes("Alert.alert"),
  });

  for (const file of LOGIN_FILES) {
    const crud = detectCrudInSource(file);
    rows.push({
      id: `crud_${file.split("/").pop()}`,
      ok: !crud.fail,
      detail: crud.signals.map((s) => s.pattern).join(",") || "PASS",
    });
  }

  const audit = enrichAuditFile(loadMarketplaceQualityAudit());
  const login = audit.screens.find((s) => s.screenId === "login");
  if (!login?.scoresAfter) {
    rows.push({ id: "login_scores_after", ok: false, detail: "missing scoresAfter in audit" });
  } else {
    const score = computeMarketplaceScore(login.scoresAfter);
    const feeling = computeMarketplaceFeeling(login.scoresAfter);
    const before = login.marketplaceScoreBefore ?? 0;
    const delta = score !== null && before ? Math.round((score - before) * 100) / 100 : null;

    rows.push({ id: "login_marketplace_score", ok: score !== null && score >= 9.0, detail: String(score) });
    rows.push({ id: "login_marketplace_feeling", ok: feeling !== null && feeling >= 9.5, detail: String(feeling) });
    rows.push({ id: "login_score_delta", ok: delta !== null && delta >= 2.0, detail: String(delta) });
    rows.push({ id: "login_p0", ok: login.issues.filter((i) => i.priority === "P0").length === 0 });
    rows.push({ id: "login_p1", ok: login.issues.filter((i) => i.priority === "P1").length === 0 });
  }

  saveMarketplaceQualityAudit(audit);

  const failed = rows.filter((r) => !r.ok);
  const report = {
    epic: "EPIC-84",
    sprint: 1,
    name: "Login Experience",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    loginScreen: login ?? null,
    rows,
  };

  const outDir = join(root, "artifacts/epic-84-sprint-1-login");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "sprint-gate.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
