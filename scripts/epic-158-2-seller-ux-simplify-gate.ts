#!/usr/bin/env tsx
/** EPIC 158.2 — Seller UX Simplification + Commerce Polish gate */
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

mustContain("apps/mobile/src/theme/tokens.ts", "ctaPrimary:", "cta_primary_token");
mustContain("apps/mobile/src/components/ui/Chip.tsx", "numberOfLines={1}", "category_single_line");
mustContain("apps/mobile/src/components/ui/ProductCartCta.tsx", "colors.ctaPrimary", "cart_cta_orange");
mustContain("apps/mobile/src/seller/lot-create-errors.ts", "formdatapart", "human_error_mapper");
mustContain("apps/mobile/src/seller/lot-create-copy.ts", "Продолжить", "continue_copy");
mustContain("apps/mobile/src/seller/lot-create-copy.ts", "Проверьте ЛОТ", "preview_title");
mustContain("apps/mobile/src/seller/LotCreateStickyFooter.tsx", "layout.stickyCtaHeight", "sticky_footer");
mustContain("apps/mobile/app/sell/create.tsx", "LotCreateStickyFooter", "create_sticky_cta");
mustContain("apps/mobile/app/sell/create.tsx", "LOT_CREATE_COPY.retryLabel", "retry_button");
mustNotContain("apps/mobile/src/seller/lot-create-copy.ts", "черновик", "no_chernovik_copy");
mustNotContain("apps/mobile/app/sell/create.tsx", "товар", "no_tovar_in_create");
mustNotContain("apps/mobile/app/sell/create.tsx", "черновик", "no_chernovik_in_create");

const failed = checks.filter((c) => !c.ok);
const verdict = failed.length === 0 ? "PASS" : "FAIL";

console.log(
  JSON.stringify(
    {
      epic: "EPIC_158_2",
      verdict,
      status: failed.length === 0 ? "READY_FOR_SELLER_UX_REVIEW" : "BLOCKED",
      checks,
      failed: failed.map((c) => c.id),
    },
    null,
    2,
  ),
);

process.exit(failed.length === 0 ? 0 : 1);
