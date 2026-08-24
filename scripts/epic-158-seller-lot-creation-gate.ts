#!/usr/bin/env tsx
/** EPIC 158 — Mobile Seller LOT Creation MVP gate */
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

mustContain("features/auth/resolve-request-user.ts", "requireSellerFromRequest", "seller_auth_bridge");
mustContain("app/api/mobile/seller/products/route.ts", "POST", "seller_products_post");
mustContain("app/api/mobile/seller/products/[id]/route.ts", "PATCH", "seller_products_patch");
mustContain("app/api/mobile/seller/uploads/route.ts", "requireSellerFromRequest", "seller_uploads_route");
mustContain("apps/mobile/app/(tabs)/sell.tsx", 'router.push("/sell/create")', "sell_entry_create_lot");
mustContain("apps/mobile/app/sell/create.tsx", "Опубликовать ЛОТ", "create_lot_wizard");
mustContain("apps/mobile/app/(tabs)/seller-products.tsx", "Мои ЛОТы", "my_lots_screen");
mustContain("apps/mobile/app/(tabs)/seller-products.tsx", "Черновики", "my_lots_tabs");
mustContain("apps/mobile/src/seller/lot-draft-storage.ts", "lot-draft-v1", "local_draft_storage");
mustContain("apps/mobile/src/components/ui/SellerProductCard.tsx", "ProductImageFallback", "seller_card_image_fallback");

const failed = checks.filter((c) => !c.ok);
const verdict = failed.length === 0 ? "PASS" : "FAIL";

console.log(
  JSON.stringify(
    {
      epic: "EPIC_158",
      verdict,
      status: failed.length === 0 ? "READY_FOR_RC9_SELLER_CREATION" : "BLOCKED",
      checks,
      failed: failed.map((c) => c.id),
    },
    null,
    2,
  ),
);

process.exit(failed.length === 0 ? 0 : 1);
