#!/usr/bin/env node
/**
 * Staging backend stability gate — sequential probe workload.
 * Fails on any unexplained HTTP 500 (application-level).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const RUN_ID = process.env.STABILITY_RUN_ID ?? `stability-${Date.now()}`;
const OUT = resolve("artifacts/staging-stability/backend-stability-gate.json");

const application500s = [];
const transportErrors = [];
const probes = [];

async function timedFetch(path, init = {}, token, cookie = "") {
  const headers = {
    ...(init.headers ?? {}),
    "x-acceptance-run-id": RUN_ID,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const started = performance.now();
  try {
    const res = await fetch(`${STAGING}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(45000),
    });
    const durationMs = Math.round(performance.now() - started);
    const body = await res.json().catch(() => ({}));
    const row = {
      at: new Date().toISOString(),
      path,
      method: init.method ?? "GET",
      status: res.status,
      durationMs,
      runId: RUN_ID,
    };
    probes.push(row);
    if (res.status >= 500) {
      application500s.push({ ...row, body });
    }
    return { ok: res.ok, status: res.status, body, durationMs };
  } catch (err) {
    const durationMs = Math.round(performance.now() - started);
    transportErrors.push({
      at: new Date().toISOString(),
      path,
      method: init.method ?? "GET",
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

async function login(email) {
  const r = await timedFetch("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "login",
      email,
      password: PASSWORD,
      deviceId: `stability-${RUN_ID}-${email}`,
    }),
  });
  return r.body?.accessToken ?? null;
}

function mergeCookies(existing, setCookie) {
  const jar = new Map();
  for (const part of existing ? existing.split("; ") : []) {
    const [k, ...v] = part.split("=");
    if (k) jar.set(k, v.join("="));
  }
  for (const line of setCookie ?? []) {
    const [pair] = line.split(";");
    const [k, ...v] = pair.split("=");
    if (k) jar.set(k.trim(), v.join("="));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function adminLogin() {
  let cookie = "";
  const csrfRes = await fetch(`${STAGING}/api/auth/csrf`, { redirect: "manual" });
  cookie = mergeCookies(cookie, csrfRes.headers.getSetCookie?.() ?? []);
  const csrfToken = (await csrfRes.json()).csrfToken;
  const loginRes = await fetch(`${STAGING}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams({
      csrfToken,
      email: process.env.ADMIN_EMAIL ?? "admin@demo.lot",
      password: process.env.ADMIN_PASSWORD ?? PASSWORD,
      callbackUrl: STAGING,
    }),
    redirect: "manual",
  });
  cookie = mergeCookies(cookie, loginRes.headers.getSetCookie?.() ?? []);
  return cookie;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  mkdirSync(resolve("artifacts/staging-stability"), { recursive: true });

  const health = await timedFetch("/api/health");
  const seller = await login("seller@demo.lot");
  const buyer = await login("buyer@demo.lot");
  if (!seller || !buyer) throw new Error("login failed");

  await sleep(300);
  await timedFetch("/api/mobile/catalog/products?q=дрель", {}, buyer);
  await sleep(300);

  const catalog = await timedFetch("/api/mobile/catalog/products?q=rc104", {}, buyer);
  const sampleId = catalog.body?.items?.[0]?.id;
  if (sampleId) {
    await sleep(300);
    await timedFetch(`/api/products/${sampleId}`, {}, buyer);
  }

  await sleep(300);
  const adminCookie = await adminLogin();
  await timedFetch("/api/admin/moderation", {}, null, adminCookie);

  const durations = probes.map((p) => p.durationMs).sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)] ?? 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    runId: RUN_ID,
    deployedSha: health.body?.version?.commit ?? null,
    probes,
    transportErrors,
    application500s,
    application500Count: application500s.length,
    transportErrorCount: transportErrors.length,
    latencyMs: { p50, p95, samples: durations.length },
    verdict: application500s.length === 0 ? "PASS" : "FAIL",
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(application500s.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
