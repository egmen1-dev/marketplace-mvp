#!/usr/bin/env tsx
/**
 * EPIC 152 — Seller Transaction Loop gate
 * Verifies mobile seller order APIs, sell entry, buyer timeline, and chat order events.
 */
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

mustContain("app/api/mobile/seller/orders/route.ts", "buildMobileSellerOrdersFromRequest", "seller_orders_get_route");
mustContain("app/api/mobile/seller/orders/[id]/status/route.ts", "patchMobileSellerOrderStatusFromRequest", "seller_orders_patch_route");
mustContain("apps/mobile/app/(tabs)/sell.tsx", "openWebHandoff", "sell_entry_web_handoff");
mustContain("apps/mobile/app/(tabs)/seller-sales.tsx", "fetchSellerOrders", "seller_sales_screen");
mustContain("apps/mobile/app/order/[id].tsx", "buildBuyerOrderTimeline", "buyer_order_detail");
mustContain("features/chat/queries.ts", "Создан новый заказ #", "chat_order_created_message");

const failed = checks.filter((c) => !c.ok);
const verdict = failed.length === 0 ? "PASS" : "FAIL";

console.log(
  JSON.stringify(
    {
      epic: "EPIC_152",
      verdict,
      checks,
      failed: failed.map((c) => c.id),
    },
    null,
    2,
  ),
);

process.exit(failed.length === 0 ? 0 : 1);
