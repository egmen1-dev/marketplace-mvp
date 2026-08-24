#!/usr/bin/env tsx
/** EPIC 158.1 — Seller LOT Creation UX Hardening gate */
import { readFileSync } from "node:fs";

const checks: Array<{ id: string; ok: boolean; detail: string }> = [];

function pass(id: string, detail: string) {
  checks.push({ id, ok: true, detail });
}

function fail(id: string, detail: string) {
  checks.push({ id, ok: false, detail });
}

function mustContain(file: string, needle: string, id: string) {
  const src = readFileSync(file, "utf8");
  if (src.includes(needle)) pass(id, `${file} contains ${needle}`);
  else fail(id, `${file} missing ${needle}`);
}

function mustNotContain(file: string, needle: string, id: string) {
  const src = readFileSync(file, "utf8");
  if (!src.includes(needle)) pass(id, `${file} excludes ${needle}`);
  else fail(id, `${file} still contains ${needle}`);
}

mustContain("apps/mobile/src/seller/lot-draft-storage.ts", "lot-draft-v2", "draft_v2");
mustContain("apps/mobile/src/seller/lot-create-copy.ts", "Продолжить", "continue_copy");
mustContain("apps/mobile/src/seller/lot-create-copy.ts", "Вы начали создавать ЛОТ", "restore_prompt");
mustContain("apps/mobile/src/seller/lot-create-copy.ts", "Сохранено", "autosave_indicator");
mustContain("apps/mobile/src/seller/use-lot-create-form.ts", "useFocusEffect", "navigation_preserve");
mustContain("apps/mobile/src/seller/use-lot-create-form.ts", "uploadImagesWithRecovery", "upload_recovery");
mustContain("app/api/mobile/seller/pickup-points/route.ts", "listSellerPickupPoints", "pickup_api");
mustNotContain("apps/mobile/app/sell/create.tsx", "Черновик ЛОТа", "no_draft_word_create");
mustNotContain("apps/mobile/app/(tabs)/seller-products.tsx", "Черновики", "no_drafts_tab_label");

const failed = checks.filter((c) => !c.ok);
const verdict = failed.length === 0 ? "PASS" : "FAIL";

console.log(
  JSON.stringify(
    {
      epic: "EPIC_158_1",
      verdict,
      status: failed.length === 0 ? "READY_FOR_SELLER_TEST" : "BLOCKED",
      checks,
      failed: failed.map((c) => c.id),
    },
    null,
    2,
  ),
);

process.exit(failed.length === 0 ? 0 : 1);
