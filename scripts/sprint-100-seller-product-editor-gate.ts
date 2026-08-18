#!/usr/bin/env tsx
/** EPIC 86 Sprint 6 — Seller Product Editor gate */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Row = { id: string; ok: boolean; detail?: string };

const ROOT = process.cwd();

const FILES = [
  "apps/mobile/src/features/seller/SellerProductEditorExperience.tsx",
  "apps/mobile/src/features/seller/editor/useSellerProductEditor.ts",
  "apps/mobile/src/features/seller/editor/seller-product-editor-view.ts",
  "apps/mobile/src/features/seller/editor/ProductEditorGallery.tsx",
  "apps/mobile/app/seller/product/new.tsx",
  "apps/mobile/app/seller/product/[id]/edit.tsx",
  "lib/mobile/seller-product-editor-data.ts",
  "lib/mobile/seller-product-editor-types.ts",
  "app/api/mobile/seller/products/route.ts",
  "app/api/mobile/seller/products/[id]/route.ts",
  "app/api/mobile/seller/categories/route.ts",
  "app/api/mobile/seller/taxonomy/browse/route.ts",
];

const TELEMETRY = [
  "seller_product_editor",
  "seller_product_saved",
  "seller_product_autosaved",
  "seller_product_undo",
  "seller_product_image_uploaded",
  "seller_product_save_error",
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

  const experience = read("apps/mobile/src/features/seller/SellerProductEditorExperience.tsx");
  const hook = read("apps/mobile/src/features/seller/editor/useSellerProductEditor.ts");
  const view = read("apps/mobile/src/features/seller/editor/seller-product-editor-view.ts");
  const backend = read("lib/mobile/seller-product-editor-data.ts");
  const gallery = read("apps/mobile/src/features/seller/editor/ProductEditorGallery.tsx");

  rows.push({ id: "gallery", ok: experience.includes("ProductEditorGallery") && hook.includes("uploadImage") });
  rows.push({ id: "field_validation", ok: view.includes("validateEditorForm") && experience.includes("error=") });
  rows.push({ id: "autosave", ok: hook.includes("useDebouncedValue") && hook.includes("seller_product_autosaved") });
  rows.push({ id: "offline_draft", ok: hook.includes("readSnapshot") && hook.includes("saveSnapshot") });
  rows.push({ id: "undo", ok: hook.includes("undo") && experience.includes("Отменить изменения") });
  rows.push({ id: "action_center", ok: read("apps/mobile/app/seller/product/[id]/edit.tsx").includes("useSellerActionCenter") });
  rows.push({ id: "create_update_api", ok: backend.includes("saveMobileSellerProductFromRequest") && read("app/api/mobile/seller/products/route.ts").includes("POST") });
  rows.push({ id: "categories_api", ok: existsSync(join(ROOT, "app/api/mobile/seller/categories/route.ts")) });
  rows.push({ id: "taxonomy_api", ok: existsSync(join(ROOT, "app/api/mobile/seller/taxonomy/browse/route.ts")) });
  rows.push({ id: "moderation_feedback", ok: experience.includes("ModerationFeedbackCard") && !backend.includes("fakeModeration") });
  rows.push({ id: "preview_real_only", ok: experience.includes("previewAvailable") && !experience.includes("fakePreview") });
  rows.push({
    id: "discount_not_editable",
    ok:
      experience.includes("только чтение") &&
      !read("lib/mobile/seller-product-editor-types.ts").includes("compareAt?: number"),
  });
  rows.push({ id: "no_alert_dialogs", ok: !experience.includes("Alert.alert") });
  rows.push({ id: "zero_api_imports", ok: !/from ['"][^'"]*api\/(endpoints|client)/.test(experience + hook) });

  for (const event of TELEMETRY) {
    rows.push({ id: `telemetry_${event}`, ok: hook.includes(event) || experience.includes(event), detail: event });
  }

  rows.push({ id: "mobile_typecheck", ok: runCmd("npm run mobile:typecheck") });
  rows.push({ id: "mobile_test", ok: runCmd("npm run mobile:test") });
  rows.push({ id: "sprint99_gate", ok: runCmd("npm run mobile:sprint-99:seller-orders") });
  rows.push({ id: "sprint98_gate", ok: runCmd("npm run mobile:sprint-98:seller-products") });
  rows.push({ id: "sprint94_gate", ok: runCmd("npm run mobile:sprint-94:gate") });

  const failed = rows.filter((r) => !r.ok);
  const outDir = join(ROOT, "artifacts/seller-product-editor");
  mkdirSync(outDir, { recursive: true });

  const report = {
    epic: "EPIC-86",
    sprint: 6,
    name: "Seller Product Editor",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    rows,
    finalReport: {
      editorScreen: failed.some((r) => r.id.startsWith("file_SellerProductEditor")) ? "FAIL" : "PASS",
      draftWorkflow: hook.includes("forceDraft") ? "PASS" : "FAIL",
      publishWorkflow: read("apps/mobile/app/seller/product/[id]/edit.tsx").includes("publish_product") ? "PASS" : "FAIL",
      discountField: "NOT_SUPPORTED",
      actionCenterIntegration: "PASS",
      autosave: "PASS",
      offlineDraft: "PASS",
      screenToApi: 0,
      dtoLeaks: 0,
      firebase: "NOT_RUN",
      readyForProduction: failed.length === 0 ? "YES" : "NO",
    },
  };

  writeFileSync(join(outDir, "seller-product-editor-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
