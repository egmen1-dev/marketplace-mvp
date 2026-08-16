#!/usr/bin/env tsx
/** MOBILE-STAGING-DEPLOY-AND-PHYSICAL-GATE-002 — staging backend smoke for mobile client. */
import { execSync } from "node:child_process";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const BUYER_EMAIL = process.env.MOBILE_TEST_EMAIL ?? "buyer@demo.lot";
const BUYER_PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const SELLER_EMAIL = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const SELLER_PASSWORD = process.env.MOBILE_SELLER_PASSWORD ?? "demo1234";

type Result = { name: string; ok: boolean; detail?: string };

async function json(path: string, init?: RequestInit) {
  const res = await fetch(`${STAGING}${path}`, { ...init, signal: AbortSignal.timeout(15000) });
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

async function main() {
  const results: Result[] = [];
  const mainSha = execSync("git rev-parse origin/main", { encoding: "utf8" }).trim().slice(0, 7);

  const version = await json("/api/version");
  const stagingSha = String((version.body as { commit?: string; sha?: string }).commit ?? (version.body as { sha?: string }).sha ?? "").slice(0, 7);
  results.push({
    name: "staging_sha_equals_main",
    ok: stagingSha === mainSha,
    detail: `staging=${stagingSha || "?"} main=${mainSha}`,
  });

  for (const [name, path] of [
    ["bootstrap", "/api/mobile/bootstrap"],
    ["config", "/api/mobile/config"],
    ["android_update", "/api/mobile/android/update"],
  ] as const) {
    const r = await json(path);
    results.push({ name, ok: r.ok, detail: String(r.status) });
  }

  const buyerLogin = await login(BUYER_EMAIL, BUYER_PASSWORD, "mobile-smoke-buyer");
  const buyerToken = (buyerLogin.body as { accessToken?: string }).accessToken;
  const buyerRefresh = (buyerLogin.body as { refreshToken?: string }).refreshToken;
  results.push({ name: "buyer_login", ok: buyerLogin.ok && Boolean(buyerToken), detail: String(buyerLogin.status) });

  if (buyerToken) {
    const auth = { Authorization: `Bearer ${buyerToken}`, "Content-Type": "application/json" };
    for (const [name, path] of [
      ["buyer_home", "/api/mobile/buyer/home"],
      ["navigation", "/api/mobile/navigation"],
      ["catalog", "/api/mobile/catalog/products?limit=5"],
      ["cart_get", "/api/cart"],
      ["orders", "/api/orders"],
      ["favorites_get", "/api/mobile/favorites"],
      ["wallet", "/api/mobile/wallet"],
    ] as const) {
      const r = await json(path, { headers: auth });
      results.push({ name, ok: r.ok, detail: String(r.status) });
    }

    const catalog = await json("/api/mobile/catalog/products?limit=1", { headers: auth });
    const productId = ((catalog.body as { items?: Array<{ id?: string }> }).items ?? [])[0]?.id;
    if (productId) {
      const addCart = await json("/api/cart", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      results.push({ name: "cart_add_bearer", ok: addCart.ok, detail: String(addCart.status) });

      const favToggle = await json("/api/mobile/favorites", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ productId }),
      });
      results.push({ name: "favorites_toggle_bearer", ok: favToggle.ok, detail: String(favToggle.status) });
    } else {
      results.push({ name: "cart_add_bearer", ok: false, detail: "no product in catalog" });
    }
  }

  if (buyerRefresh) {
    const refreshed = await json("/api/mobile/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: buyerRefresh }),
    });
    results.push({ name: "refresh", ok: refreshed.ok, detail: String(refreshed.status) });
  }

  const sellerLogin = await login(SELLER_EMAIL, SELLER_PASSWORD, "mobile-smoke-seller");
  const sellerToken = (sellerLogin.body as { accessToken?: string }).accessToken;
  results.push({ name: "seller_login", ok: sellerLogin.ok && Boolean(sellerToken), detail: String(sellerLogin.status) });

  if (sellerToken) {
    const sellerAuth = { Authorization: `Bearer ${sellerToken}` };
    const sellerHome = await json("/api/mobile/seller/home", { headers: sellerAuth });
    results.push({ name: "seller_home", ok: sellerHome.ok, detail: String(sellerHome.status) });
    const payload = sellerHome.body as { products?: { active: number }; money?: { available: number } };
    results.push({
      name: "seller_home_real_data",
      ok: sellerHome.ok && typeof payload.products?.active === "number",
      detail: JSON.stringify(payload.products ?? {}),
    });
  }

  // Cookie session should still work for web cart without Bearer (expect 401 without cookie — sanity)
  const cartNoAuth = await json("/api/cart");
  results.push({ name: "cart_requires_auth", ok: cartNoAuth.status === 401, detail: String(cartNoAuth.status) });

  const report = { staging: STAGING, generatedAt: new Date().toISOString(), mainSha, stagingSha, results };
  console.log(JSON.stringify(report, null, 2));
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
