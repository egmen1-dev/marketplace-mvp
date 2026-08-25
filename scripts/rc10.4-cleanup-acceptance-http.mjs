#!/usr/bin/env node
/**
 * HTTP-based staging cleanup for rc104- acceptance fixtures (no DATABASE_URL required).
 */
const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const PREFIX = "rc104-";

async function login(email) {
  const res = await fetch(`${STAGING}/api/mobile/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId: `cleanup-${Date.now()}` }),
  });
  const body = await res.json().catch(() => ({}));
  return body?.accessToken ?? null;
}

async function json(path, init = {}, token) {
  const headers = { ...(init.headers ?? {}), Authorization: `Bearer ${token}` };
  const res = await fetch(`${STAGING}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  if (!STAGING.includes("railway.app") && !STAGING.includes("localhost")) {
    throw new Error(`Refusing cleanup outside staging: ${STAGING}`);
  }

  const token = await login(SELLER);
  if (!token) throw new Error("seller login failed");

  const removed = [];
  let cursor = "1";
  const seen = new Set();

  for (let page = 0; page < 50; page += 1) {
    const list = await json(`/api/mobile/seller/products?cursor=${cursor}`, {}, token);
    const items = list.body?.items ?? [];
    if (!items.length) break;

    for (const item of items) {
      if (!item?.title?.startsWith(PREFIX) || seen.has(item.id)) continue;
      seen.add(item.id);
      const del = await json(`/api/products/${item.id}`, { method: "DELETE" }, token);
      removed.push({ id: item.id, title: item.title, status: del.status });
    }

    if (!list.body?.hasMore) break;
    cursor = String(Number(cursor) + 1);
  }

  console.log(JSON.stringify({ prefix: PREFIX, removedCount: removed.length, removed: removed.slice(0, 20) }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
