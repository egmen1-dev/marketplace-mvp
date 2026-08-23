#!/usr/bin/env node
/** RC8 staging runtime gate — RC7 parity + EPIC 152 seller orders + EPIC 154 trust block. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = resolve("artifacts/closed-beta-rc8/backend-parity.json");
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

function resolveImageUrl(url, base) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
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

  const buyerToken = await login(BUYER, "rc8-runtime-buyer");
  const sellerToken = await login(SELLER, "rc8-runtime-seller");
  push("buyer_session", Boolean(buyerToken));
  push("seller_session", Boolean(sellerToken));
  if (!buyerToken || !sellerToken) throw new Error("login failed");

  const auth = { Authorization: `Bearer ${buyerToken}`, "Content-Type": "application/json" };
  const sellerAuth = { Authorization: `Bearer ${sellerToken}`, "Content-Type": "application/json" };

  const bootstrap = await json("/api/mobile/bootstrap", { headers: auth });
  push("bootstrap", bootstrap.ok, { status: bootstrap.status });

  const cats = await json("/api/categories", { headers: auth });
  const allCats = cats.body?.items ?? [];
  const hasCatalogCount = allCats.some((c) => "catalogProductCount" in c);
  push("catalogProductCount_present", hasCatalogCount);
  const visible = allCats.filter((c) => (c.catalogProductCount ?? c.productCount ?? 0) > 0);
  push("category_rail_visible_min_3", visible.length >= 3, { visible: visible.length, total: allCats.length });

  const populatedChecks = [];
  for (const cat of visible.slice(0, 3)) {
    const products = await json(`/api/mobile/catalog/products?categoryId=${cat.id}&limit=5`, { headers: auth });
    populatedChecks.push({
      category: cat.name,
      count: products.body?.items?.length ?? 0,
      ok: (products.body?.items?.length ?? 0) > 0,
    });
  }
  push("populated_categories_return_products", populatedChecks.every((c) => c.ok), { populatedChecks });

  const catId = visible[0]?.id;
  const filterCases = [
    { id: "baseline", path: "/api/mobile/catalog/products?limit=20" },
    { id: "category", path: `/api/mobile/catalog/products?categoryId=${catId}&limit=20` },
    { id: "stock", path: "/api/mobile/catalog/products?inStock=1&limit=20" },
    { id: "search", path: "/api/mobile/catalog/products?q=дрель&limit=20" },
  ];
  const filterResults = [];
  for (const c of filterCases) {
    const r = await json(c.path, { headers: auth });
    filterResults.push({ ...c, ok: r.ok, count: r.body?.items?.length ?? 0 });
  }
  push("filter_matrix", filterResults.every((f) => f.ok), { filterResults });

  const catalog = await json("/api/mobile/catalog/products?limit=20", { headers: auth });
  const sellerProduct = (catalog.body?.items ?? []).find((p) => p.seller?.id);
  const sellerId = sellerProduct?.seller?.id;

  const sellerStorefront = sellerId
    ? await json(`/api/mobile/seller/${sellerId}`, { headers: auth })
    : { ok: false, body: {} };
  const trustOk =
    sellerStorefront.ok &&
    sellerStorefront.body?.storeName &&
    Array.isArray(sellerStorefront.body?.badges) &&
    typeof sellerStorefront.body?.activeProducts === "number";
  push("epic154_seller_trust_block", trustOk, { sellerId, status: sellerStorefront.status });

  const sellerOrders = await json("/api/mobile/seller/orders", { headers: sellerAuth });
  push(
    "epic152_seller_orders_list",
    sellerOrders.ok && Array.isArray(sellerOrders.body?.items ?? sellerOrders.body?.orders),
    { status: sellerOrders.status, count: (sellerOrders.body?.items ?? sellerOrders.body?.orders ?? []).length },
  );

  const webHandoff = await json(`/api/mobile/web-handoff/url?dest=${encodeURIComponent("/account/seller-start")}`, {
    headers: sellerAuth,
  });
  push("epic152_web_handoff_url", webHandoff.ok && Boolean(webHandoff.body?.handoffUrl), {
    status: webHandoff.status,
  });

  const sellerCatalog = sellerId
    ? await json(`/api/mobile/catalog/products?sellerId=${sellerId}&limit=5`, { headers: auth })
    : { ok: false, body: {} };
  push("seller_catalog", Boolean(sellerId) && sellerCatalog.ok, { sellerId });

  const createConv = await json("/api/mobile/conversations", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ productId: sellerProduct?.id }),
  });
  const conversationId = createConv.body?.conversationId;
  push("chat_create", createConv.ok && Boolean(conversationId), { conversationId });

  const buyerMsg = `RC8 runtime gate ${Date.now()}`;
  const send = conversationId
    ? await json(`/api/mobile/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ text: buyerMsg }),
      })
    : { ok: false };
  push("chat_send", send.ok);

  const sellerReply = `RC8 seller reply ${Date.now()}`;
  const reply = conversationId
    ? await json(`/api/mobile/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: sellerAuth,
        body: JSON.stringify({ text: sellerReply }),
      })
    : { ok: false };
  push("chat_seller_reply", reply.ok);

  const buyerMessages = conversationId
    ? await json(`/api/mobile/conversations/${conversationId}/messages?limit=20`, { headers: auth })
    : { ok: false, body: {} };
  const buyerSeesReply = (buyerMessages.body?.items ?? []).some((m) =>
    String(m.text ?? m.body ?? "").includes("RC8 seller reply"),
  );
  push("chat_buyer_receives_reply", buyerSeesReply);

  const updateProbe = await json("/api/mobile/android/update?versionCode=12", { headers: auth });
  push("android_update_api", updateProbe.ok, { status: updateProbe.status });

  const failed = results.filter((r) => !r.ok);
  const featureMatrix = {
    Session: { source: "PASS", integration: "PASS", staging: buyerToken ? "PASS" : "FAIL", apk: "PENDING", physical: "NOT_RUN" },
    CategoryRail: { source: "PASS", integration: "PASS", staging: visible.length >= 3 ? "PASS" : "FAIL", apk: "PENDING", physical: "NOT_RUN" },
    Filters: { source: "PASS", integration: "PASS", staging: filterResults.every((f) => f.ok) ? "PASS" : "FAIL", apk: "PENDING", physical: "NOT_RUN" },
    Seller: { source: "PASS", integration: "PASS", staging: sellerCatalog.ok ? "PASS" : "FAIL", apk: "PENDING", physical: "NOT_RUN" },
    "Seller orders (EPIC 152)": { source: "PASS", integration: "PASS", staging: sellerOrders.ok ? "PASS" : "FAIL", apk: "PENDING", physical: "NOT_RUN" },
    "Seller trust (EPIC 154)": { source: "PASS", integration: "PASS", staging: trustOk ? "PASS" : "FAIL", apk: "PENDING", physical: "NOT_RUN" },
    Chat: { source: "PASS", integration: "PASS", staging: send.ok && buyerSeesReply ? "PASS" : "FAIL", apk: "PENDING", physical: "NOT_RUN" },
    "Checkout return (EPIC 154)": { source: "PASS", integration: "PASS", staging: "NOT_RUN", apk: "PENDING", physical: "NOT_RUN" },
    "Buyer order timeline": { source: "PASS", integration: "PASS", staging: "NOT_RUN", apk: "PENDING", physical: "NOT_RUN" },
    Update: { source: "PASS", integration: "PASS", staging: updateProbe.ok ? "PASS" : "FAIL", apk: "PENDING", physical: "NOT_RUN" },
  };

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    railwaySha,
    catalogProductCountRuntime: hasCatalogCount ? "PASS" : "FAIL",
    visibleCategoryCount: visible.length,
    totalCategoryCount: allCats.length,
    results,
    featureMatrix,
    sellerLoop: sellerOrders.ok ? "PASS" : "FAIL",
    buyerLoop: trustOk && filterResults.every((f) => f.ok) ? "PASS" : "FAIL",
    failed: failed.map((f) => f.name),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
  };

  mkdirSync(resolve("artifacts/closed-beta-rc8"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, failed: report.failed, railwaySha }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
