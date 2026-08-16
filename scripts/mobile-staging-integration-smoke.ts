#!/usr/bin/env tsx
/** Pre-device API integration smoke — validates staging backend for mobile client flows. */
const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const EMAIL = process.env.MOBILE_TEST_EMAIL ?? "buyer@demo.lot";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";

type Result = { name: string; ok: boolean; detail?: string };

async function json(path: string, init?: RequestInit) {
  const res = await fetch(`${STAGING}${path}`, init);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  const results: Result[] = [];

  const boot = await json("/api/mobile/bootstrap");
  results.push({ name: "bootstrap", ok: boot.ok, detail: String(boot.status) });

  const login = await json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: EMAIL, password: PASSWORD, deviceId: "physical-smoke-001" }),
  });
  const access = (login.body as { accessToken?: string }).accessToken;
  const refresh = (login.body as { refreshToken?: string }).refreshToken;
  results.push({ name: "login", ok: login.ok && Boolean(access), detail: String(login.status) });

  if (!access) {
    print(results);
    process.exit(1);
  }

  const auth = { Authorization: `Bearer ${access}`, "Content-Type": "application/json" };

  for (const [name, path] of [
    ["buyer_home", "/api/mobile/buyer/home"],
    ["navigation", "/api/mobile/navigation"],
    ["catalog", "/api/mobile/catalog/products?limit=5"],
    ["cart", "/api/cart"],
    ["orders", "/api/orders"],
    ["favorites", "/api/mobile/favorites"],
    ["wallet", "/api/mobile/wallet"],
    ["android_update", "/api/mobile/android/update"],
  ] as const) {
    const r = await json(path, { headers: auth });
    results.push({ name, ok: r.ok, detail: String(r.status) });
  }

  if (refresh) {
    const refreshed = await json("/api/mobile/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    results.push({ name: "refresh", ok: refreshed.ok, detail: String(refreshed.status) });
  }

  print(results);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

function print(results: Result[]) {
  console.log(JSON.stringify({ staging: STAGING, generatedAt: new Date().toISOString(), results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
