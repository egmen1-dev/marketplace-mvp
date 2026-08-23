#!/usr/bin/env node
/**
 * RC5 staging runtime smoke — real API contract verification.
 * Outputs artifacts/closed-beta-rc5/staging-runtime-smoke.json
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const BUYER_EMAIL = process.env.MOBILE_TEST_EMAIL ?? "buyer@demo.lot";
const BUYER_PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";

async function json(path, init) {
  const res = await fetch(`${STAGING}${path}`, { ...init, signal: AbortSignal.timeout(20000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function login(email, password, deviceId) {
  return json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password, deviceId }),
  });
}

async function main() {
  const results = [];
  const mainSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim().slice(0, 7);

  const version = await json("/api/version");
  const stagingSha = String(version.body.commit ?? version.body.sha ?? "").slice(0, 7);
  results.push({ name: "staging_version", ok: version.ok, detail: `staging=${stagingSha} local=${mainSha}` });

  for (const [name, path] of [
    ["bootstrap", "/api/mobile/bootstrap"],
    ["categories", "/api/categories"],
    ["catalog_popular", "/api/mobile/catalog/products?sort=popular&limit=5"],
    ["catalog_newest", "/api/mobile/catalog/products?sort=newest&limit=5"],
    ["update_v7", "/api/mobile/update?versionCode=7&channel=CLOSED_BETA"],
    ["update_v8", "/api/mobile/update?versionCode=8&channel=CLOSED_BETA"],
    ["android_update_v7", "/api/mobile/android/update?versionCode=7"],
  ]) {
    const r = await json(path);
    const count = r.body?.items?.length ?? r.body?.versionCode ?? null;
    results.push({ name, ok: r.ok, status: r.status, count, updateState: r.body?.updateState });
  }

  const buyerLogin = await login(BUYER_EMAIL, BUYER_PASSWORD, "rc5-smoke-buyer");
  const buyerToken = buyerLogin.body?.accessToken;
  results.push({ name: "buyer_login", ok: buyerLogin.ok && Boolean(buyerToken), status: buyerLogin.status });

  if (buyerToken) {
    const auth = { Authorization: `Bearer ${buyerToken}`, "Content-Type": "application/json" };
    const catalog = await json("/api/mobile/catalog/products?limit=3", { headers: auth });
    const categories = await json("/api/categories", { headers: auth });
    results.push({ name: "catalog_authenticated", ok: catalog.ok, count: catalog.body?.items?.length ?? 0 });

    const categoryId = categories.body?.items?.[0]?.id;
    if (categoryId) {
      const filtered = await json(`/api/mobile/catalog/products?categoryId=${categoryId}&limit=5`, { headers: auth });
      results.push({
        name: "catalog_category_filter",
        ok: filtered.ok,
        categoryId,
        count: filtered.body?.items?.length ?? 0,
        verdict: filtered.ok ? "PASS" : "FAIL",
      });
    }

    const productId = catalog.body?.items?.[0]?.id;
    const sellerId = catalog.body?.items?.[0]?.sellerId;
    if (productId) {
      const addCart = await json("/api/cart", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      results.push({ name: "cart_add", ok: addCart.ok, status: addCart.status, productId, verdict: addCart.ok ? "PASS" : "FAIL" });

      const favToggle = await json("/api/mobile/favorites", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ productId }),
      });
      results.push({ name: "favorites_toggle", ok: favToggle.ok, status: favToggle.status, verdict: favToggle.ok ? "PASS" : "FAIL" });

      const favRemove = await json("/api/mobile/favorites", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ productId }),
      });
      results.push({ name: "favorites_remove", ok: favRemove.ok, isFavorite: favRemove.body?.isFavorite, verdict: favRemove.ok ? "PASS" : "FAIL" });
    }

    if (sellerId) {
      const sellerCatalog = await json(`/api/mobile/catalog/products?sellerId=${sellerId}&limit=5`, { headers: auth });
      results.push({ name: "seller_catalog", ok: sellerCatalog.ok, sellerId, count: sellerCatalog.body?.items?.length ?? 0 });
    }
  } else {
    results.push({ name: "commerce_auth", ok: false, verdict: "STAGING_AUTH_FIXTURE_REQUIRED" });
  }

  const passed = results.filter((r) => r.ok).length;
  const p0 = ["buyer_login", "cart_add", "favorites_toggle", "catalog_popular"];
  const p0Ok = p0.every((name) => results.find((r) => r.name === name)?.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    mainSha,
    stagingSha,
    summary: { total: results.length, passed, failed: results.length - passed },
    results,
    verdict: p0Ok ? "PASS" : "FAIL",
  };

  const outDir = resolve("artifacts/closed-beta-rc5");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "staging-runtime-smoke.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.verdict === "PASS" ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
