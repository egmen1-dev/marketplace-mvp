#!/usr/bin/env node
/** Catalog filter matrix — staging HTTP verification. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = resolve("artifacts/mobile-physical-fixes/filter-matrix.json");

async function json(path, token) {
  const res = await fetch(`${STAGING}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(25000),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body, count: body?.items?.length ?? 0 };
}

async function login() {
  const r = await fetch(`${STAGING}/api/mobile/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: "buyer@demo.lot", password: "demo1234", deviceId: "filter-matrix" }),
  });
  const body = await r.json();
  return body.accessToken;
}

async function main() {
  const token = await login();
  const cats = await json("/api/categories", token);
  const categoryId = cats.body?.items?.[0]?.id;
  const baseline = await json("/api/mobile/catalog/products?limit=20", token);

  const cases = [
    { id: "baseline", path: "/api/mobile/catalog/products?limit=20" },
    { id: "category", path: `/api/mobile/catalog/products?categoryId=${categoryId}&limit=20` },
    { id: "in_stock", path: "/api/mobile/catalog/products?inStock=1&limit=20" },
    { id: "sort_newest", path: "/api/mobile/catalog/products?sort=newest&limit=20" },
    { id: "category_stock", path: `/api/mobile/catalog/products?categoryId=${categoryId}&inStock=1&limit=20` },
    { id: "category_sort", path: `/api/mobile/catalog/products?categoryId=${categoryId}&sort=price_asc&limit=20` },
    { id: "search_only", path: "/api/mobile/catalog/products?q=дрель&limit=20" },
    { id: "category_plus_search_conflict", path: `/api/mobile/catalog/products?categoryId=${categoryId}&q=дрель&limit=20` },
  ];

  const results = [];
  for (const c of cases) {
    const r = await json(c.path, token);
    results.push({
      ...c,
      ok: r.ok,
      status: r.status,
      count: r.count,
      verdict: r.ok ? "PASS" : "FAIL",
      note:
        c.id === "category_plus_search_conflict"
          ? "AND semantics — client must clear q when category selected"
          : undefined,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    baselineCount: baseline.count,
    categoryId,
    results,
    clientFixes: [
      "useFocusEffect clears q when categoryId param set",
      "CategoryRail onSelect clears q",
      "clearFilters resets category, q, stock, deals, sort",
    ],
    verdict: results.every((r) => r.ok) ? "PASS" : "FAIL",
  };

  mkdirSync(resolve("artifacts/mobile-physical-fixes"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, cases: results.length }, null, 2));
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
