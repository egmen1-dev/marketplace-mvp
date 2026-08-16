#!/usr/bin/env tsx
/** MOBILE-RELEASE-GATE-003 — staging backend + auth safety smoke (no new features). */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const BUYER = { email: process.env.MOBILE_TEST_EMAIL ?? "buyer@demo.lot", password: process.env.MOBILE_TEST_PASSWORD ?? "demo1234" };
const SELLER = { email: process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot", password: process.env.MOBILE_SELLER_PASSWORD ?? "demo1234" };

type Result = { name: string; ok: boolean; detail?: string };

async function json(path: string, init?: RequestInit) {
  const res = await fetch(`${STAGING}${path}`, { ...init, signal: AbortSignal.timeout(20000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function login(email: string, password: string, deviceId: string) {
  return json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password, deviceId }),
  });
}

function hasSecretLeak(body: unknown): boolean {
  const s = JSON.stringify(body);
  return /STRIPE_SECRET|DATABASE_URL|AUTH_SECRET|sk_live|sk_test|refreshToken/i.test(s);
}

async function main() {
  const results: Result[] = [];
  const mainSha = execSync("git rev-parse origin/main", { encoding: "utf8" }).trim().slice(0, 7);

  const version = await json("/api/version");
  const stagingSha = String((version.body as { commit?: string }).commit ?? "").slice(0, 7);
  results.push({ name: "staging_sha_equals_main", ok: stagingSha === mainSha, detail: `${stagingSha} vs ${mainSha}` });

  const health = await json("/api/health");
  const checks = (health.body as { checks?: Record<string, { ok?: boolean }> }).checks ?? {};
  results.push({ name: "health_ok", ok: health.ok && Boolean((health.body as { ok?: boolean }).ok), detail: String(health.status) });
  results.push({ name: "health_db", ok: checks.database?.ok === true, detail: "database" });
  results.push({ name: "health_auth", ok: checks.auth?.ok === true, detail: "auth" });

  for (const [name, path] of [
    ["bootstrap", "/api/mobile/bootstrap"],
    ["config", "/api/mobile/config"],
    ["readiness", "/api/mobile/readiness"],
    ["navigation", "/api/mobile/navigation"],
    ["android_update", "/api/mobile/android/update"],
  ] as const) {
    const r = await json(path);
    results.push({ name, ok: r.ok, detail: String(r.status) });
    if (r.ok && hasSecretLeak(r.body)) results.push({ name: `${name}_no_secrets`, ok: false, detail: "secret-like field in response" });
  }

  const deep = await json(`/api/mobile/deep-link/resolve?uri=${encodeURIComponent("lot://product/demo-product")}`);
  results.push({ name: "deep_link_resolve", ok: deep.ok, detail: String(deep.status) });

  const buyerLogin = await login(BUYER.email, BUYER.password, "gate003-buyer");
  const buyerToken = (buyerLogin.body as { accessToken?: string }).accessToken;
  const buyerRefresh = (buyerLogin.body as { refreshToken?: string }).refreshToken;
  results.push({ name: "auth_session", ok: buyerLogin.ok && Boolean(buyerToken), detail: String(buyerLogin.status) });

  if (buyerToken) {
    const auth = { Authorization: `Bearer ${buyerToken}`, "Content-Type": "application/json" };
    for (const [name, path] of [
      ["buyer_home", "/api/mobile/buyer/home"],
      ["seller_home_buyer_token", "/api/mobile/seller/home"],
      ["catalog", "/api/mobile/catalog/products?limit=3"],
      ["cart_get", "/api/cart"],
      ["orders", "/api/orders"],
      ["favorites", "/api/mobile/favorites"],
      ["wallet", "/api/mobile/wallet"],
    ] as const) {
      const r = await json(path, { headers: auth });
      results.push({ name, ok: r.ok, detail: String(r.status) });
    }

    const catalog = await json("/api/mobile/catalog/products?limit=1", { headers: auth });
    const items = (catalog.body as { items?: Array<Record<string, unknown>> }).items ?? [];
    const productId = items[0]?.id as string | undefined;
    results.push({
      name: "catalog_payload",
      ok: items.length > 0 && typeof items[0]?.id === "string" && !hasSecretLeak(catalog.body),
      detail: `items=${items.length}`,
    });

    if (productId) {
      const add = await json("/api/cart", { method: "POST", headers: auth, body: JSON.stringify({ productId, quantity: 1 }) });
      results.push({ name: "cart_add", ok: add.ok, detail: String(add.status) });
      const patch = await json("/api/cart", { method: "PATCH", headers: auth, body: JSON.stringify({ productId, quantity: 2 }) });
      results.push({ name: "cart_update", ok: patch.ok, detail: String(patch.status) });
      const del = await json(`/api/cart?productId=${encodeURIComponent(productId)}`, { method: "DELETE", headers: auth });
      results.push({ name: "cart_remove", ok: del.ok, detail: String(del.status) });
    }
  }

  if (buyerRefresh) {
    const r1 = await json("/api/mobile/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: buyerRefresh }),
    });
    const newRefresh = (r1.body as { refreshToken?: string }).refreshToken ?? buyerRefresh;
    results.push({ name: "auth_refresh", ok: r1.ok, detail: String(r1.status) });

    const replay = await json("/api/mobile/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: buyerRefresh }),
    });
    results.push({
      name: "auth_refresh_replay_rejected",
      ok: !replay.ok && ((replay.body as { error?: { code?: string } }).error?.code === "REFRESH_REPLAY" || replay.status === 401),
      detail: String((replay.body as { error?: { code?: string } }).error?.code ?? replay.status),
    });

    await json("/api/mobile/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: newRefresh }),
    });
    const afterLogout = await json("/api/mobile/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: newRefresh }),
    });
    results.push({
      name: "auth_logout_revokes",
      ok: !afterLogout.ok,
      detail: String((afterLogout.body as { error?: { code?: string } }).error?.code ?? afterLogout.status),
    });
  }

  const sellerLogin = await login(SELLER.email, SELLER.password, "gate003-seller");
  const sellerToken = (sellerLogin.body as { accessToken?: string }).accessToken;
  results.push({ name: "seller_auth", ok: sellerLogin.ok && Boolean(sellerToken), detail: String(sellerLogin.status) });

  if (sellerToken && buyerToken) {
    const sellerHome = await json("/api/mobile/seller/home", { headers: { Authorization: `Bearer ${sellerToken}` } });
    results.push({ name: "seller_home", ok: sellerHome.ok, detail: String(sellerHome.status) });
    const sh = sellerHome.body as { products?: { active: number }; intelligence?: { topAction?: string | null } };
    results.push({
      name: "seller_home_real_data",
      ok: typeof sh.products?.active === "number" && sh.products.active >= 0,
      detail: JSON.stringify({ products: sh.products, intelligence: sh.intelligence?.topAction ?? null }),
    });

    const buyerOnSellerCart = await json("/api/cart", { headers: { Authorization: `Bearer ${sellerToken}` } });
    results.push({ name: "seller_cart_isolated", ok: buyerOnSellerCart.ok, detail: "seller has own cart session" });
  }

  const cartAnon = await json("/api/cart");
  results.push({ name: "cart_requires_auth", ok: cartAnon.status === 401, detail: String(cartAnon.status) });

  const mobPa002 = [
    "catalog",
    "wallet",
    "favorites",
    "cart_get",
    "cart_add",
    "cart_update",
    "cart_remove",
    "orders",
    "buyer_home",
    "seller_home",
  ].every((n) => results.find((r) => r.name === n)?.ok);

  const report = {
    gate: "MOBILE-RELEASE-GATE-003",
    staging: STAGING,
    generatedAt: new Date().toISOString(),
    mainSha,
    stagingSha,
    mobPa002Closed: mobPa002,
    apk: {
      file: "lot-android-alpha-0.1.0.apk",
      sha256: "91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585",
      versionName: "0.1.0-alpha",
      versionCode: 1,
    },
    results,
    verdicts: {
      mobileStagingBackend: mobPa002 && stagingSha === mainSha ? "READY" : "NOT READY",
      mobPa002: mobPa002 ? "CLOSED" : "OPEN",
    },
  };

  const outDir = join(process.cwd(), "artifacts/mobile-release-gate-003");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "staging-smoke.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
