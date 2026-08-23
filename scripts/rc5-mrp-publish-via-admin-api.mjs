#!/usr/bin/env node
/**
 * Publish RC5 to MRP via staging admin API (server-side DB access).
 * Used when local DATABASE_URL is unavailable in cloud agent VM.
 */
const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@demo.lot";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "demo1234";

const RC5 = {
  versionName: "0.1.10-beta.1",
  versionCode: 9,
  gitCommit: "baf8cd1",
  sha256: "2d4041c5e29e31c25ac7cab65ce7d98d1c402ded5ba0307d71922cb220e3e4d1",
  artifactSizeBytes: 43492086,
  downloadUrl:
    "https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/artifacts/closed-beta-rc5/lot_android_closed_beta_0.1.10_beta.1.apk",
  channel: "BETA",
  releaseNotes: [
    "Closed Beta RC5 — release-truth audit + physical validation build",
    "P0 commerce wiring: cart, favorites, catalog filters, seller nav",
    "Session warm on boot; commerce telemetry MOBILE_COMMERCE_ACTION",
    "Native About screen with build identity (version, SHA, RC5)",
    "Honest update flow: browser handoff → Android installer",
    "Visual polish: compact category chips, CatalogToolbar, BootSplash",
    "MRP publish for in-app update delivery (versionCode 9)",
  ].join("\n"),
  minAppVersion: "0.1.7-beta.1",
};

async function fetchJson(url, init = {}, cookie = "") {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
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
  for (const part of (existing ? existing.split("; ") : [])) {
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
      body: new URLSearchParams({
        csrfToken,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        callbackUrl: STAGING,
      }).toString(),
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
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    cookie,
  );
  if (res.status >= 400) {
    throw new Error(`Admin API ${payload.action} failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function main() {
  const cookie = await adminLogin();
  const list = await fetchJson(`${STAGING}/api/admin/mobile/releases`, {}, cookie);
  const existing = (list.body.releases ?? []).find((r) => r.versionCode === RC5.versionCode);

  let releaseId = existing?.id;
  if (!releaseId) {
    const created = await adminPost(cookie, {
      action: "create",
      input: {
        versionName: RC5.versionName,
        versionCode: RC5.versionCode,
        gitCommit: RC5.gitCommit,
        sha256: RC5.sha256,
        channel: RC5.channel,
        releaseNotes: RC5.releaseNotes,
        downloadUrl: RC5.downloadUrl,
        minAppVersion: RC5.minAppVersion,
        artifactSizeBytes: RC5.artifactSizeBytes,
        rolloutPercent: 100,
        mandatory: false,
      },
    });
    releaseId = created.release?.id;
  }

  if (!releaseId) throw new Error("No releaseId after create");

  if (existing?.status !== "PUBLISHED") {
    await adminPost(cookie, { action: "rollout", releaseId, percent: 100 });
    const published = await adminPost(cookie, { action: "publish", releaseId });
    console.log(JSON.stringify({ published: published.release }, null, 2));
  } else {
    console.log(JSON.stringify({ alreadyPublished: existing }, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
