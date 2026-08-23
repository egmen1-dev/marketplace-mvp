#!/usr/bin/env tsx
/** EPIC 154 — Closed Beta Critical Path gate */
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

mustContain("app/api/mobile/checkout/enter/route.ts", "MOBILE_RETURN_COOKIE", "checkout_return_cookie");
mustContain("features/orders/components/mobile-checkout-return.tsx", "Открыть в приложении", "web_mobile_return_banner");
mustContain("apps/mobile/src/deep-links/native-route-map.ts", "checkoutSuccess=1", "order_deeplink_success");
mustContain("apps/mobile/app/(tabs)/orders.tsx", "Заказ оформлен", "orders_success_banner");
mustContain("apps/mobile/app/(tabs)/orders.tsx", "formatBuyerOrderStatus", "human_readable_status");
mustContain("features/orders/lib/checkout-lock.ts", "pg_advisory_xact_lock", "checkout_advisory_lock");
mustContain("features/orders/components/checkout-form.tsx", "Создание заказа…", "web_submit_guard");
mustContain("app/api/mobile/seller/[id]/route.ts", "buildMobileSellerStorefront", "seller_trust_api");
mustContain("docs/product/CLOSED_BETA_TESTER_GUIDE.md", "buyer@demo.lot", "beta_tester_guide");

const failed = checks.filter((c) => !c.ok);
const verdict = failed.length === 0 ? "PASS" : "FAIL";

console.log(JSON.stringify({ epic: "EPIC_154", verdict, checks, failed: failed.map((c) => c.id) }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
