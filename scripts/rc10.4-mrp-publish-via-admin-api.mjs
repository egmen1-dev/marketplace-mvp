#!/usr/bin/env node
/** Publish RC10.4 to MRP via staging admin API. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@demo.lot";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "demo1234";
const OUT = resolve("artifacts/closed-beta-rc10.4/mrp-publish-report.json");

const manifestPath = resolve("artifacts/closed-beta-rc10.4/build-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const RELEASE = {
  versionName: manifest.versionName,
  versionCode: manifest.versionCode,
  gitCommit: manifest.commitSha.slice(0, 7),
  sha256: manifest.artifact.sha256,
  artifactSizeBytes: manifest.artifact.sizeBytes,
  downloadUrl: `https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/${manifest.artifact.path}`,
  channel: "BETA",
  releaseNotes: [
    "Closed Beta RC10.4 — moderation seller UX + backend stability",
    "Fix: catalog phrase fast-path for hyphenated acceptance queries",
    "Fix: Prisma P1017 reconnect + boot warmup + 503 mapping",
    "Fix: serialized DB queries + moderation counters via groupBy",
    "Includes RC10.3 dynamic characteristics + RC10.2 publish truth + RC10.1 photo upload",
    "Upgrade path: codes 17–19 → RC10.4 (code 20)",
  ].join("\n"),
  minAppVersion: "0.1.7-beta.1",
};

async function fetchJson(url, init = {}, cookie = "") {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), ...(cookie ? { Cookie: cookie } : {}) },
    redirect: "manual",
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const bodyText = await res.text();
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    body = { raw: bodyText.slice(0, 500) };
  }
  return { status: res.status, body, setCookie };
}

function mergeCookies(existing, setCookie) {
  const jar = new Map();
  for (const part of existing ? existing.split("; ") : []) {
    const [k, ...v] = part.split("=");
    if (k) jar.set(k, v.join("="));
  }
  for (const line of setCookie) {
    const [pair] = line.split(";");
    const [k, ...v] = pair.split("=");
    if (k) jar.set(k.trim(), v.join("="));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function adminLogin() {
  let cookie = "";
  const csrfRes = await fetchJson(`${STAGING}/api/auth/csrf`, {}, cookie);
  cookie = mergeCookies(cookie, csrfRes.setCookie);
  const csrfToken = csrfRes.body.csrfToken;
  if (!csrfToken) throw new Error("Failed to obtain CSRF token");
  const loginRes = await fetchJson(
    `${STAGING}/api/auth/callback/credentials`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, callbackUrl: STAGING }).toString(),
    },
    cookie,
  );
  cookie = mergeCookies(cookie, loginRes.setCookie);
  if (!cookie.includes("authjs.session-token") && !cookie.includes("__Secure-authjs.session-token")) {
    throw new Error(`Admin login failed (status ${loginRes.status})`);
  }
  return cookie;
}

async function adminPost(cookie, payload) {
  const res = await fetchJson(
    `${STAGING}/api/admin/mobile/releases`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    cookie,
  );
  if (res.status >= 400) throw new Error(`Admin API ${payload.action} failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

async function main() {
  const cookie = await adminLogin();
  const list = await fetchJson(`${STAGING}/api/admin/mobile/releases`, {}, cookie);
  const existing = (list.body.releases ?? []).find((r) => r.versionCode === RELEASE.versionCode);
  let releaseId = existing?.id;
  let status = existing?.status ?? "DRAFT";
  if (!releaseId) {
    const created = await adminPost(cookie, { action: "create", input: RELEASE });
    releaseId = created.release?.id;
    status = created.release?.status ?? "DRAFT";
  }
  if (!releaseId) throw new Error("No releaseId after create");
  if (status !== "PUBLISHED") {
    await adminPost(cookie, { action: "rollout", releaseId, percent: 100 });
    await adminPost(cookie, { action: "publish", releaseId });
    status = "PUBLISHED";
  }

  const report = {
    generatedAt: new Date().toISOString(),
    publishMethod: "staging_admin_api",
    versionName: RELEASE.versionName,
    versionCode: RELEASE.versionCode,
    channel: "BETA",
    clientChannel: "CLOSED_BETA",
    sha256: RELEASE.sha256,
    downloadUrl: RELEASE.downloadUrl,
    status,
    updatePath: {
      code17: "OPTIONAL_UPDATE→20",
      code18: "OPTIONAL_UPDATE→20",
      code19: "OPTIONAL_UPDATE→20",
      code20: "NO_UPDATE",
      code21plus: "NO_UPDATE",
    },
    verdict: status === "PUBLISHED" ? "PASS" : "FAIL",
  };

  mkdirSync(resolve("artifacts/closed-beta-rc10.4"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
