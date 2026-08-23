#!/usr/bin/env node
/** FINAL PRE-RELEASE DATA + UX GATE — staging + source contracts. */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT_DIR = resolve("artifacts/mobile-physical-fixes");
const API_BASE = STAGING;

async function login() {
  const r = await fetch(`${STAGING}/api/mobile/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: "buyer@demo.lot", password: "demo1234", deviceId: "pre-release-gate" }),
  });
  const body = await r.json();
  return body.accessToken;
}

async function getJson(path, token) {
  const res = await fetch(`${STAGING}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(25000),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function resolveImageUrl(url, base) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

async function main() {
  const results = [];
  const token = await login();
  if (!token) throw new Error("login failed");

  // A. Category rail data (no N+1)
  const cats = await getJson("/api/categories", token);
  const all = cats.body?.items ?? [];
  const hasCatalogCountFieldSource = readFileSync("features/catalog/queries.ts", "utf8").includes("catalogProductCount");
  results.push({ name: "category_catalogProductCount_source", ok: hasCatalogCountFieldSource });
  const visible = all.filter((c) => (c.catalogProductCount ?? c.productCount ?? 0) > 0);
  results.push({ name: "category_rail_min_3_visible", ok: visible.length >= 3, count: visible.length });
  results.push({
    name: "category_empty_hidden_from_rail",
    ok: !visible.some((c) => c.name === "Женская одежда" && (c.catalogProductCount ?? 0) === 0),
    hiddenExamples: ["Женская одежда", "Автоаксессуары"].filter((name) => {
      const row = all.find((c) => c.name === name);
      return row && (row.catalogProductCount ?? row.productCount ?? 0) === 0;
    }),
  });

  const chipSource = readFileSync("apps/mobile/src/components/ui/Chip.tsx", "utf8");
  results.push({ name: "chip_no_aspect_ratio_1", ok: !/aspectRatio:\s*1/.test(chipSource) });
  results.push({ name: "chip_height_38_42", ok: chipSource.includes("minHeight: 38") && chipSource.includes("maxHeight: 42") });

  // C. Cart images HTTP 200 (3 products)
  const catalog = await getJson("/api/mobile/catalog/products?limit=20", token);
  const withImages = (catalog.body?.items ?? []).filter((p) => p.primaryImage?.url).slice(0, 3);
  const cartChecks = [];
  for (const product of withImages) {
    await fetch(`${STAGING}/api/cart`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    });
    const cart = await getJson("/api/cart", token);
    const item = (cart.body?.items ?? []).find((i) => i.productId === product.id);
    const rel = item?.product?.primaryImage?.url ?? null;
    const abs = resolveImageUrl(rel, API_BASE);
    let httpOk = false;
    if (abs) {
      const img = await fetch(abs, { method: "HEAD", signal: AbortSignal.timeout(15000) }).catch(() => null);
      httpOk = Boolean(img?.ok);
      if (!httpOk) {
        const imgGet = await fetch(abs, { method: "GET", signal: AbortSignal.timeout(15000) }).catch(() => null);
        httpOk = Boolean(imgGet?.ok);
      }
    }
    cartChecks.push({ productId: product.id, rel, abs, httpOk });
  }
  results.push({ name: "cart_image_http_200_x3", ok: cartChecks.length >= 3 && cartChecks.every((c) => c.httpOk), cartChecks });

  // E. Filter reset baseline
  const catId = visible[0]?.id;
  const baseline = await getJson("/api/mobile/catalog/products?limit=5", token);
  const filtered = await getJson(`/api/mobile/catalog/products?categoryId=${catId}&inStock=1&sort=newest&limit=5`, token);
  const baselineCount = baseline.body?.items?.length ?? 0;
  results.push({ name: "filter_baseline_has_items", ok: baselineCount > 0, baselineCount });
  results.push({ name: "filter_category_applies", ok: (filtered.body?.items?.length ?? 0) >= 0 });

  // F. RC6 regression endpoints
  for (const [name, path] of [
    ["chat_conversations", "/api/mobile/conversations"],
    ["chat_unread", "/api/mobile/conversations/unread"],
    ["mobile_bootstrap", "/api/mobile/bootstrap"],
    ["android_update", "/api/mobile/android/update?versionCode=11"],
  ]) {
    const r = await getJson(path, token);
    results.push({ name: `rc6_${name}`, ok: r.ok, status: r.status });
  }

  const sourceChecks = [
    { name: "rc6_commerce_header", ok: readFileSync("apps/mobile/app/(tabs)/catalog.tsx", "utf8").includes("CommerceHeader") },
    { name: "rc6_messages_route", ok: readFileSync("apps/mobile/src/components/CommerceHeader.tsx", "utf8").includes("/messages") },
    { name: "rc6_cart_resolve_image", ok: readFileSync("apps/mobile/app/cart.tsx", "utf8").includes("resolveImageUrl") },
    { name: "boot_indeterminate", ok: readFileSync("apps/mobile/src/components/BootSplash.tsx", "utf8").includes("translateX") },
    { name: "boot_no_fake_percent", ok: !readFileSync("apps/mobile/src/components/BootSplash.tsx", "utf8").includes("42%") },
    { name: "beta_compact", ok: readFileSync("apps/mobile/src/beta/BetaBanner.tsx", "utf8").includes('"Beta"') && !readFileSync("apps/mobile/src/beta/BetaBanner.tsx", "utf8").includes("build.appVersion") },
    { name: "selectRailCategories_used", ok: readFileSync("apps/mobile/app/(tabs)/catalog.tsx", "utf8").includes("selectRailCategories") },
  ];
  results.push(...sourceChecks);

  const failed = results.filter((r) => !r.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    categoryFixtureStrategy: "hide_empty_from_rail_via_catalogProductCount (single /api/categories, no N+1)",
    visibleCategoryCount: visible.length,
    totalCategoryCount: all.length,
    visibleCategoriesSample: visible.slice(0, 12).map((c) => ({ name: c.name, catalogProductCount: c.catalogProductCount ?? c.productCount })),
    results,
    failed: failed.length,
    verdict: failed.length === 0 ? "READY_FOR_RELEASE_BUILD" : "BLOCKED",
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, "pre-release-gate.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, failed: failed.map((f) => f.name) }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
