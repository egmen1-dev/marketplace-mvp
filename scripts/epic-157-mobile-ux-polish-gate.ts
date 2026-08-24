#!/usr/bin/env tsx
/** EPIC 157 — Final Mobile Marketplace UX Polish gate */
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

mustContain("apps/mobile/app/(tabs)/_layout.tsx", "headerShown: false", "no_duplicate_header");
mustContain("apps/mobile/src/components/ui/ProductCard.tsx", "ProductImageFallback", "image_fallback");
mustContain("apps/mobile/src/components/ui/ProductCard.tsx", "ProductCartCta", "cart_cta_stepper");
mustContain("apps/mobile/src/components/ui/Chip.tsx", 'variant?: "default" | "category"', "category_chip_variant");
mustContain("apps/mobile/src/components/ui/feedback.tsx", "catalogCategory", "catalog_empty_states");
mustContain("apps/mobile/app/(tabs)/catalog.tsx", "catalogEmptyPreset", "catalog_empty_selector");
mustContain("apps/mobile/src/hooks/useCommerceActions.ts", "incrementProductCart", "inline_quantity_handlers");

const failed = checks.filter((c) => !c.ok);
const verdict = failed.length === 0 ? "PASS" : "FAIL";

console.log(JSON.stringify({ epic: "EPIC_157", verdict, checks, failed: failed.map((c) => c.id) }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
