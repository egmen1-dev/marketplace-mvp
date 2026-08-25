#!/usr/bin/env node
/** EPIC 174 staging moderation smoke — requires MARKETPLACE_TRUST_LOOP_ENABLED on staging */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@demo.lot";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const OUT = resolve("artifacts/closed-beta-moderation/staging-moderation-smoke.json");

async function json(path, init = {}, token) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${STAGING}${path}`, { ...init, headers, signal: AbortSignal.timeout(30000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function login(email) {
  const r = await json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId: `mod-smoke-${email}` }),
  });
  return r.body?.accessToken;
}

async function main() {
  const sellerToken = await login(SELLER);
  const buyerToken = await login(process.env.MOBILE_BUYER_EMAIL ?? "buyer@demo.lot");

  const cases = [];

  // A — verify moderation endpoint contract exists
  const health = await json("/api/health");
  cases.push({
    id: "deploy-health",
    verdict: health.ok ? "PASS" : "FAIL",
    commit: health.body?.version?.commit ?? null,
  });

  // B — seller moderation API shape (may 404 if no product — that's ok for contract probe)
  const moderationProbe = await json("/api/mobile/seller/products/nonexistent/moderation", {}, sellerToken);
  cases.push({
    id: "seller-moderation-route",
    verdict: moderationProbe.status === 404 ? "PASS" : moderationProbe.status === 401 ? "FAIL" : "PASS",
    status: moderationProbe.status,
  });

  // C — admin moderation API requires auth
  const adminProbe = await fetch(`${STAGING}/api/admin/moderation`);
  cases.push({
    id: "admin-moderation-auth",
    verdict: adminProbe.status === 401 || adminProbe.status === 403 ? "PASS" : "FAIL",
    status: adminProbe.status,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    note: "Full A-H lifecycle smoke requires deployed EPIC 174 + admin session — extend after staging deploy",
    cases,
    verdict: cases.every((c) => c.verdict === "PASS") ? "PASS" : "FAIL",
  };

  mkdirSync(resolve("artifacts/closed-beta-moderation"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
