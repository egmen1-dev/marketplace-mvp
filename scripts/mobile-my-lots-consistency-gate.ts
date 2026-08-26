#!/usr/bin/env node
/** P0 — My LOTs tab/search consistency gate (server + mobile wiring). */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const OUT = resolve("artifacts/p0-my-lots-consistency/gate-report.json");

function effectiveSection(item: {
  sellerSection?: string;
  status?: string;
  moderationState?: string | null;
}): string {
  if (item.sellerSection) return item.sellerSection;
  const status = item.status;
  const mod = item.moderationState ?? null;
  if (status === "ARCHIVED") return "sold";
  if (status === "ACTIVE") return "active";
  if (mod === "NEEDS_FIX") return "needs_fix";
  if (mod === "PENDING_REVIEW") return "pending";
  if (mod === "REJECTED") return "rejected";
  return "drafts";
}

function sectionMatchesTab(section: string, tab: string): boolean {
  if (tab === "active") return section === "active";
  if (tab === "pending") return section === "pending" || section === "needs_fix";
  if (tab === "drafts") return section === "drafts" || section === "rejected";
  if (tab === "sold") return section === "sold";
  return false;
}

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: "inherit" });
}

async function json(path, init = {}, token) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${STAGING}${path}`, { ...init, headers, signal: AbortSignal.timeout(45000) });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function login(email) {
  const r = await json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId: `my-lots-gate-${email}` }),
  });
  return r.body?.accessToken;
}

async function stagingApiChecks(token) {
  const checks = [];
  const tabs = ["active", "pending", "drafts", "sold"];
  const byTab = {};

  for (const tab of tabs) {
    const r = await json(`/api/mobile/seller/products?tab=${tab}`, {}, token);
    const items = r.body?.items ?? [];
    byTab[tab] = items;
    const wrongSection = items.filter((item) => !sectionMatchesTab(effectiveSection(item), tab));
    checks.push({
      id: `tab_filter_${tab}`,
      ok: wrongSection.length === 0,
      detail: wrongSection.length === 0 ? "PASS" : `wrong rows: ${wrongSection.map((i) => i.id).join(",")}`,
    });
  }

  const allIds = Object.values(byTab).flatMap((items) => items.map((i) => i.id));
  const dupInTab = Object.entries(byTab).some(([, items]) => {
    const s = new Set();
    for (const i of items) {
      if (s.has(i.id)) return true;
      s.add(i.id);
    }
    return false;
  });
  checks.push({ id: "no_duplicate_ids_per_tab", ok: !dupInTab, detail: dupInTab ? "duplicate id in tab response" : "PASS" });

  const crossTab = [...new Set(allIds)].filter((id) => {
    const tabsWith = Object.entries(byTab).filter(([, items]) => items.some((i) => i.id === id)).map(([t]) => t);
    return tabsWith.length > 1;
  });
  checks.push({
    id: "no_cross_tab_duplicates",
    ok: crossTab.length === 0,
    detail: crossTab.length ? `ids in multiple tabs: ${crossTab.join(",")}` : "PASS",
  });

  const sampleTitle = byTab.pending[0]?.title ?? byTab.drafts[0]?.title ?? byTab.active[0]?.title;
  if (sampleTitle) {
    const tokenQ = sampleTitle.split(/\s+/)[0];
    const search = await json(`/api/mobile/seller/products?tab=pending&q=${encodeURIComponent(tokenQ)}`, {}, token);
    const found = (search.body?.items ?? []).some((i) => String(i.title).toLowerCase().includes(tokenQ.toLowerCase()));
    checks.push({ id: "server_search_pending", ok: found || (search.body?.items ?? []).length === 0, detail: `q=${tokenQ}` });
  }

  return checks;
}

async function main() {
  const checks = [];

  try {
    run("npm", ["test", "--", "tests/seller-lots-section.test.ts", "tests/mobile-my-lots-consistency.test.ts"]);
    checks.push({ id: "vitest", ok: true, detail: "PASS" });
  } catch {
    checks.push({ id: "vitest", ok: false, detail: "FAIL" });
  }

  const token = await login(SELLER);
  if (!token) {
    checks.push({ id: "staging_login", ok: false, detail: "seller login failed" });
  } else {
    checks.push({ id: "staging_login", ok: true, detail: "PASS" });
    checks.push(...(await stagingApiChecks(token)));
  }

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    checks,
    failed: failed.map((f) => f.id),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
  };

  mkdirSync(resolve("artifacts/p0-my-lots-consistency"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, failed: report.failed }, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
