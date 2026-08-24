#!/usr/bin/env tsx
/** EPIC 159 — Closed Beta Seller Acceptance gate */
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

mustContain("docs/product/SELLER_BETA_ACCEPTANCE_REPORT.md", "READY_FOR_FIRST_BETA_USERS", "acceptance_report");
mustContain("docs/mobile/EPIC_159_PHYSICAL_ACCEPTANCE_CHECKLIST.md", "seller@demo.lot", "physical_checklist");
mustContain("apps/mobile/src/seller/use-lot-create-form.ts", "publishOnServer", "no_duplicate_publish");
mustContain("apps/mobile/src/api/seller-lot.ts", "updateSellerLot", "patch_saved_lot");
mustContain("apps/mobile/src/seller/lot-create-copy.ts", "Ваш ЛОТ теперь виден покупателям", "success_copy");
mustContain("apps/mobile/src/update/use-update-check.ts", "AppState.addEventListener", "update_foreground");

const failed = checks.filter((c) => !c.ok);
const verdict = failed.length === 0 ? "PASS" : "FAIL";

console.log(
  JSON.stringify(
    {
      epic: "EPIC_159",
      verdict,
      status: failed.length === 0 ? "READY_FOR_FIRST_BETA_USERS" : "BLOCKED_BY_CRITICAL_ISSUES",
      checks,
      failed: failed.map((c) => c.id),
    },
    null,
    2,
  ),
);

process.exit(failed.length === 0 ? 0 : 1);
