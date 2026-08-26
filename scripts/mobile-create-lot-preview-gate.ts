#!/usr/bin/env node
/** P0 — mobile create LOT preview validation regression gate */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { evaluateLotPreviewValidation } from "@/lib/mobile/lot-preview-validation";

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

const required = [
  "lib/mobile/lot-preview-validation.ts",
  "apps/mobile/src/seller/lot-preview-validation.ts",
  "apps/mobile/src/seller/use-lot-create-form.ts",
  "apps/mobile/app/sell/create.tsx",
];

for (const file of required) {
  if (!existsSync(file)) fail(`missing ${file}`);
}

const hookSource = readFileSync("apps/mobile/src/seller/use-lot-create-form.ts", "utf8");
const createSource = readFileSync("apps/mobile/app/sell/create.tsx", "utf8");

if (!hookSource.includes("evaluateLotPreviewValidation")) {
  fail("use-lot-create-form must use evaluateLotPreviewValidation");
}
if (!hookSource.includes("previewBlockersMessage")) {
  fail("use-lot-create-form must expose previewBlockersMessage");
}
if (createSource.includes('disabled={!form.canContinueDetails}')) {
  fail("Preview button must not be silently disabled — use actionable preview + hint");
}
if (!createSource.includes("previewBlockersMessage")) {
  fail("create screen must show preview blockers hint");
}
if (!createSource.includes("accessibilityState")) {
  fail("category selection must expose accessibility selected state");
}

const smartphone = evaluateLotPreviewValidation({
  title: "Телефон самсунг a57",
  price: "11000",
  stock: "1",
  city: "Москва",
  categoryId: "cat-1",
  productTypeId: "pt-1",
  imagesCount: 1,
  pickupEnabled: false,
  pickupPointIds: [],
  characteristicDefinitions: [],
  characteristicValues: {},
});
if (!smartphone.canPreview) {
  fail(`smartphone regression: expected canPreview true, got blockers ${JSON.stringify(smartphone.previewBlockers)}`);
}

const partial = evaluateLotPreviewValidation({
  title: "Телефон самсунг a57",
  price: "11000",
  stock: "1",
  city: "",
  categoryId: "cat-1",
  productTypeId: null,
  imagesCount: 1,
  pickupEnabled: false,
  pickupPointIds: [],
  characteristicDefinitions: [],
  characteristicValues: {},
});
if (partial.canPreview) fail("partial smartphone draft must not pass preview");
if (!partial.previewBlockers.some((b) => b.code === "PRODUCT_TYPE_MISSING")) {
  fail("missing product type must be reported");
}
if (!partial.previewBlockers.some((b) => b.code === "CITY_MISSING")) {
  fail("missing city must be reported");
}

console.log("[RUN] vitest mobile-lot-preview-validation");
execFileSync("npm", ["test", "--", "tests/mobile-lot-preview-validation.test.ts"], { stdio: "inherit" });

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      smartphoneCanPreview: smartphone.canPreview,
      partialBlockers: partial.previewBlockers.map((b) => b.code),
      policyWeakening: "NOT_DETECTED",
    },
    null,
    2,
  ),
);
