#!/usr/bin/env node
/** RC9.1 staging runtime gate — RC8 parity + EPIC 157/158 seller LOT APIs. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = resolve("artifacts/closed-beta-rc9.1/backend-parity.json");
const BUYER = process.env.MOBILE_TEST_EMAIL ?? "buyer@demo.lot";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";

async function json(path, init = {}, token) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${STAGING}${path}`, { ...init, headers, signal: AbortSignal.timeout(25000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function login(email, deviceId) {
  const r = await json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId }),
  });
  return r.body?.accessToken;
}

async function main() {
  const results = [];
  const push = (name, ok, detail = {}) => {
    results.push({ name, ok, ...detail });
    return ok;
  };

  const health = await json("/api/health");
  const railwaySha = health.body?.version?.commit?.slice(0, 7);
  push("railway_health", health.ok && health.body?.ok === true, { railwaySha });

  const buyerToken = await login(BUYER, "rc9-runtime-buyer");
  const sellerToken = await login(SELLER, "rc9-runtime-seller");
  push("buyer_session", Boolean(buyerToken));
  push("seller_session", Boolean(sellerToken));
  if (!buyerToken || !sellerToken) throw new Error("login failed");

  const auth = { Authorization: `Bearer ${buyerToken}`, "Content-Type": "application/json" };
  const sellerAuth = { Authorization: `Bearer ${sellerToken}`, "Content-Type": "application/json" };

  const bootstrap = await json("/api/mobile/bootstrap", { headers: auth });
  push("bootstrap", bootstrap.ok, { status: bootstrap.status });

  const cats = await json("/api/categories", { headers: auth });
  const allCats = cats.body?.items ?? [];
  const visible = allCats.filter((c) => (c.catalogProductCount ?? c.productCount ?? 0) > 0);
  push("category_rail_visible_min_3", visible.length >= 3, { visible: visible.length });

  const catalog = await json("/api/mobile/catalog/products?limit=20", { headers: auth });
  const sellerProduct = (catalog.body?.items ?? []).find((p) => p.seller?.id);

  const sellerOrders = await json("/api/mobile/seller/orders", { headers: sellerAuth });
  push(
    "epic152_seller_orders_list",
    sellerOrders.ok && Array.isArray(sellerOrders.body?.items ?? sellerOrders.body?.orders),
    { status: sellerOrders.status },
  );

  const sellerProducts = await json("/api/mobile/seller/products?tab=active", { headers: sellerAuth });
  push("epic158_seller_products_list", sellerProducts.ok && Array.isArray(sellerProducts.body?.items), {
    status: sellerProducts.status,
    count: sellerProducts.body?.items?.length ?? 0,
  });

  const sellerDrafts = await json("/api/mobile/seller/products?tab=drafts", { headers: sellerAuth });
  push("epic158_seller_drafts_tab", sellerDrafts.ok && Array.isArray(sellerDrafts.body?.items), {
    status: sellerDrafts.status,
  });

  const taxonomy = await json("/api/taxonomy/browse?categoryId=root", { headers: sellerAuth });
  push("epic158_taxonomy_browse", taxonomy.ok && Array.isArray(taxonomy.body?.children), {
    status: taxonomy.status,
    count: taxonomy.body?.children?.length ?? 0,
  });

  const createConv = sellerProduct?.id
    ? await json("/api/mobile/conversations", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ productId: sellerProduct.id }),
      })
    : { ok: false, body: {} };
  push("chat_create", createConv.ok && Boolean(createConv.body?.conversationId));

  const updateProbe = await json("/api/mobile/android/update?versionCode=13", { headers: auth });
  push("android_update_api", updateProbe.ok, { status: updateProbe.status, state: updateProbe.body?.updateState });

  const failed = results.filter((r) => !r.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    railwaySha,
    results,
    sellerLoop: sellerOrders.ok && sellerProducts.ok ? "PASS" : "FAIL",
    epic158Apis: sellerProducts.ok && taxonomy.ok ? "PASS" : "FAIL",
    failed: failed.map((f) => f.name),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
  };

  mkdirSync(resolve("artifacts/closed-beta-rc9.1"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, failed: report.failed, railwaySha }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
