#!/usr/bin/env node
/** P0-A: Authoritative product truth for physical-test seller LOTs. */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const TITLE_NEEDLE = process.env.P0_TITLE_NEEDLE ?? "Жидкость для вэйпа";
const OUT = resolve("artifacts/p0-my-lots-consistency/product-truth-audit.json");

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
    body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId: `p0-truth-${email}` }),
  });
  return r.body?.accessToken;
}

async function listAllTabs(token) {
  const tabs = ["active", "pending", "drafts", "sold"];
  const byTab = {};
  for (const tab of tabs) {
    const r = await json(`/api/mobile/seller/products?tab=${tab}`, {}, token);
    byTab[tab] = {
      status: r.status,
      count: r.body?.items?.length ?? 0,
      ids: (r.body?.items ?? []).map((i) => i.id),
      items: (r.body?.items ?? []).map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        moderationState: i.moderationState ?? null,
        publishOutcome: i.publishOutcome ?? null,
        isPublic: i.isPublic ?? null,
        price: i.price,
      })),
    };
  }
  return byTab;
}

async function main() {
  const token = await login(SELLER);
  if (!token) throw new Error("seller login failed");

  const byTab = await listAllTabs(token);
  const allItems = Object.values(byTab).flatMap((t) => t.items);
  const matching = allItems.filter((i) =>
    String(i.title ?? "").toLowerCase().includes(TITLE_NEEDLE.toLowerCase()),
  );

  const uniqueIds = [...new Set(matching.map((i) => i.id))];
  const details = [];
  for (const id of uniqueIds) {
    const detail = await json(`/api/mobile/seller/products/${encodeURIComponent(id)}`, {}, token);
    const mod = await json(`/api/mobile/seller/products/${encodeURIComponent(id)}/moderation`, {}, token);
    const buyerPdp = await json(`/api/products/${encodeURIComponent(id)}`, {}, token);
    const buyerCatalog = await json(
      `/api/mobile/catalog/products?q=${encodeURIComponent(TITLE_NEEDLE)}`,
      {},
      token,
    );
    const inCatalog = (buyerCatalog.body?.items ?? []).some((x) => x.id === id);
    details.push({
      id,
      detail: detail.body,
      moderation: mod.body,
      buyerPdpStatus: buyerPdp.status,
      buyerCatalogVisible: inCatalog,
      tabsContainingId: Object.fromEntries(
        Object.entries(byTab).map(([tab, data]) => [tab, data.ids.includes(id)]),
      ),
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    seller: SELLER,
    titleNeedle: TITLE_NEEDLE,
    byTab,
    matchingProductCount: uniqueIds.length,
    matchingIds: uniqueIds,
    details,
    crossTabDuplicates: Object.values(byTab).some((t) => {
      const ids = new Set();
      for (const item of t.items) {
        if (ids.has(item.id)) return true;
        ids.add(item.id);
      }
      return false;
    }),
    idsInMultipleTabs: uniqueIds.filter((id) => {
      const tabs = Object.entries(byTab).filter(([, d]) => d.ids.includes(id)).map(([t]) => t);
      return tabs.length > 1;
    }),
  };

  mkdirSync(resolve("artifacts/p0-my-lots-consistency"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ matchingProductCount: uniqueIds.length, idsInMultipleTabs: report.idsInMultipleTabs }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
