#!/usr/bin/env node
/** Category data coverage audit — staging API vs category metadata. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = resolve("artifacts/mobile-physical-fixes/category-coverage.json");

async function json(path, init = {}, token) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${STAGING}${path}`, { ...init, headers, signal: AbortSignal.timeout(25000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function login() {
  const r = await json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: "buyer@demo.lot", password: "demo1234", deviceId: "category-audit" }),
  });
  return r.body?.accessToken;
}

async function main() {
  const token = await login();
  if (!token) throw new Error("Login failed");

  const auth = { Authorization: `Bearer ${token}` };
  const cats = await json("/api/categories", { headers: auth });
  const items = cats.body?.items ?? [];

  const rows = [];
  for (const cat of items) {
    const mobile = await json(`/api/mobile/catalog/products?categoryId=${cat.id}&limit=100`, { headers: auth });
    const mobileCount = mobile.body?.items?.length ?? 0;
    const eligible = cat.productCount ?? cat.activeProductCount ?? null;
    const dbProducts = eligible ?? mobileCount;
    const missing = eligible != null ? Math.max(0, eligible - mobileCount) : 0;
    let classification = "OK";
    if (eligible === 0 && mobileCount === 0) classification = "NO_CATEGORY_FIXTURE_DATA";
    else if (missing > 0) classification = "CATEGORY_FILTER_BUG";
    else if (eligible > 0 && mobileCount === 0) classification = "CATEGORY_FILTER_BUG";

    rows.push({
      categoryId: cat.id,
      category: cat.name,
      slug: cat.slug,
      dbProducts: eligible,
      eligibleProducts: eligible,
      mobileApiProducts: mobileCount,
      missing,
      classification,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    categoriesAudited: rows.length,
    filterBugs: rows.filter((r) => r.classification === "CATEGORY_FILTER_BUG").length,
    emptyFixtures: rows.filter((r) => r.classification === "NO_CATEGORY_FIXTURE_DATA").length,
    rows,
    verdict: rows.some((r) => r.classification === "CATEGORY_FILTER_BUG") ? "FAIL" : "PASS",
  };

  mkdirSync(resolve("artifacts/mobile-physical-fixes"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, filterBugs: report.filterBugs, emptyFixtures: report.emptyFixtures }, null, 2));
  process.exit(report.verdict === "PASS" ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
