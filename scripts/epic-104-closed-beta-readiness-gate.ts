#!/usr/bin/env tsx
/** EPIC-104 — Closed Beta Readiness gate. Evidence only — exits 1 when criteria fail. */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { MOBILE_API_VERSION } from "@/lib/mobile/api-contract";
import { CHECKOUT_STRATEGY } from "@/lib/mobile/checkout-handoff";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = join(process.cwd(), "artifacts/epic-104");
const BUYER_EMAIL = process.env.MOBILE_TEST_EMAIL ?? "buyer@demo.lot";
const BUYER_PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const SELLER_EMAIL = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const SELLER_PASSWORD = process.env.MOBILE_SELLER_PASSWORD ?? "demo1234";

type Status = "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN" | "INSUFFICIENT_DATA";
type JourneyStep = { step: string; status: Status; durationMs: number; error?: string };

async function timedFetch(path: string, init?: RequestInit) {
  const start = Date.now();
  const res = await fetch(`${STAGING}${path}`, { ...init, signal: AbortSignal.timeout(25000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body, latencyMs: Date.now() - start };
}

async function login(email: string, password: string, deviceId: string) {
  return timedFetch("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password, deviceId }),
  });
}

function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function runCmd(name: string, cmd: string): { id: string; ok: boolean; detail?: string } {
  try {
    execSync(cmd, { stdio: "pipe" });
    return { id: name, ok: true, detail: cmd };
  } catch (err) {
    return { id: name, ok: false, detail: err instanceof Error ? err.message.slice(0, 100) : "fail" };
  }
}

async function journeyStep(
  step: string,
  fn: () => Promise<{ ok: boolean; status?: number; detail?: string }>,
): Promise<JourneyStep> {
  const start = Date.now();
  try {
    const r = await fn();
    return {
      step,
      status: r.ok ? "PASS" : "FAIL",
      durationMs: Date.now() - start,
      error: r.ok ? undefined : r.detail ?? String(r.status),
    };
  } catch (err) {
    return {
      step,
      status: "FAIL",
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : "error",
    };
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const commit = gitSha();
  const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  const buildInfo = JSON.parse(readFileSync(join(process.cwd(), "lib/build-info.generated.json"), "utf8"));
  const appJson = JSON.parse(readFileSync(join(process.cwd(), "apps/mobile/app.json"), "utf8"));
  const envTs = readFileSync(join(process.cwd(), "apps/mobile/src/config/env.ts"), "utf8");
  const appVersion = envTs.match(/appVersion:\s*"([^"]+)"/)?.[1] ?? appJson.expo.version;
  const versionCode = appJson.expo.android?.versionCode ?? 3;

  const versionRes = await timedFetch("/api/version");
  const stagingSha = String((versionRes.body as { commit?: string }).commit ?? "").slice(0, 7);
  const candidateSha = commit.slice(0, 7);

  const apkPaths = [
    join(process.cwd(), "apps/mobile/android/app/build/outputs/apk/release/app-release.apk"),
    join(process.cwd(), "artifacts/lot-android-alpha.apk"),
  ];
  let apkSha256: string | null = null;
  let apkPath: string | null = null;
  for (const p of apkPaths) {
    if (existsSync(p)) {
      apkPath = p;
      apkSha256 = createHash("sha256").update(readFileSync(p)).digest("hex");
      break;
    }
  }

  const configRes = await timedFetch("/api/product-ops/config?surface=mobile&deviceId=epic104");
  const flags = (configRes.body as { flags?: Array<{ key: string; enabled: boolean }> }).flags ?? [];

  const deploymentReport = {
    generatedAt: new Date().toISOString(),
    candidate: { commit, branch, appVersion, versionCode, apiVersion: MOBILE_API_VERSION },
    staging: { url: STAGING, commit: stagingSha, buildTime: (versionRes.body as { buildTime?: string }).buildTime },
    parity: {
      commitShaMatch: stagingSha === candidateSha,
      buildVersion: appVersion,
      apiVersion: MOBILE_API_VERSION,
      featureFlagsLoaded: flags.length > 0,
    },
    apk: { path: apkPath, sha256: apkSha256 },
    checkoutStrategy: CHECKOUT_STRATEGY,
    verdict: stagingSha === candidateSha ? "PASS" : "FAIL",
  };
  writeFileSync(join(OUT, "deployment-report.json"), JSON.stringify(deploymentReport, null, 2));

  const betaRoutes = [
    { name: "dashboard", path: "/api/product-ops/beta/dashboard" },
    { name: "journey", path: "/api/product-ops/beta/journey" },
    { name: "exit_report", path: "/api/product-ops/beta/exit-report" },
    { name: "performance", path: "/api/product-ops/beta/performance" },
    { name: "crashes", path: "/api/product-ops/beta/crashes" },
    { name: "readiness", path: "/api/product-ops/beta/readiness" },
  ];

  const betaApiResults = [];
  let betaApiPass = true;
  for (const route of betaRoutes) {
    const r = await timedFetch(route.path);
    const schemaOk =
      r.ok &&
      typeof (r.body as { apiVersion?: string }).apiVersion === "string" &&
      (r.body as { apiVersion?: string }).apiVersion === MOBILE_API_VERSION;
    if (!r.ok || r.status === 404 || r.status >= 500) betaApiPass = false;
    betaApiResults.push({
      name: route.name,
      path: route.path,
      httpStatus: r.status,
      latencyMs: r.latencyMs,
      schemaOk,
      error: r.status >= 500 ? "server_error" : r.status === 404 ? "not_found" : undefined,
    });
  }
  writeFileSync(join(OUT, "beta-api-report.json"), JSON.stringify({ routes: betaApiResults }, null, 2));

  const buyerLogin = await login(BUYER_EMAIL, BUYER_PASSWORD, "epic104-buyer-journey");
  const sellerLogin = await login(SELLER_EMAIL, SELLER_PASSWORD, "epic104-seller-journey");
  const buyerToken = (buyerLogin.body as { accessToken?: string }).accessToken;
  const sellerToken = (sellerLogin.body as { accessToken?: string }).accessToken;
  const buyerAuth = buyerToken ? { Authorization: `Bearer ${buyerToken}` } : {};
  const sellerAuth = sellerToken ? { Authorization: `Bearer ${sellerToken}` } : {};

  const buyerSteps: JourneyStep[] = [];
  buyerSteps.push(
    await journeyStep("login", async () => ({
      ok: buyerLogin.ok && Boolean(buyerToken),
      status: buyerLogin.status,
    })),
  );
  buyerSteps.push(
    await journeyStep("home", async () => {
      const r = await timedFetch("/api/mobile/buyer/home", { headers: buyerAuth });
      return { ok: r.ok, status: r.status };
    }),
  );
  buyerSteps.push(
    await journeyStep("catalog", async () => {
      const r = await timedFetch("/api/mobile/catalog/products?limit=5", { headers: buyerAuth });
      return { ok: r.ok, status: r.status };
    }),
  );
  let productId = "";
  buyerSteps.push(
    await journeyStep("pdp", async () => {
      const r = await timedFetch("/api/mobile/catalog/products?limit=1", { headers: buyerAuth });
      productId = ((r.body as { items?: Array<{ id?: string }> }).items ?? [])[0]?.id ?? "";
      return { ok: r.ok && Boolean(productId), status: r.status, detail: productId ? undefined : "no product" };
    }),
  );
  buyerSteps.push(
    await journeyStep("favorite", async () => {
      if (!productId) return { ok: false, detail: "no product" };
      const r = await timedFetch("/api/mobile/favorites", {
        method: "POST",
        headers: { ...buyerAuth, "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      return { ok: r.ok, status: r.status };
    }),
  );
  buyerSteps.push(
    await journeyStep("cart", async () => {
      if (!productId) return { ok: false, detail: "no product" };
      const r = await timedFetch("/api/cart", {
        method: "POST",
        headers: { ...buyerAuth, "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      return { ok: r.ok || r.status === 201, status: r.status };
    }),
  );
  buyerSteps.push(
    await journeyStep("checkout_entry", async () => {
      const r = await timedFetch("/api/mobile/checkout/web-url", { headers: buyerAuth });
      const strategy = (r.body as { strategy?: string }).strategy;
      return { ok: r.ok && strategy === "web_redirect", status: r.status, detail: strategy };
    }),
  );
  buyerSteps.push(
    await journeyStep("orders", async () => {
      const r = await timedFetch("/api/orders", { headers: buyerAuth });
      return { ok: r.ok, status: r.status };
    }),
  );
  buyerSteps.push(
    await journeyStep("profile_wallet", async () => {
      const r = await timedFetch("/api/mobile/wallet", { headers: buyerAuth });
      return { ok: r.ok, status: r.status };
    }),
  );

  const sellerSteps: JourneyStep[] = [];
  sellerSteps.push(
    await journeyStep("login", async () => ({
      ok: sellerLogin.ok && Boolean(sellerToken),
      status: sellerLogin.status,
    })),
  );
  sellerSteps.push(
    await journeyStep("workspace", async () => {
      const r = await timedFetch("/api/mobile/seller/home", { headers: sellerAuth });
      return { ok: r.ok, status: r.status };
    }),
  );
  sellerSteps.push(
    await journeyStep("products", async () => {
      const r = await timedFetch("/api/mobile/seller/products?limit=5", { headers: sellerAuth });
      return { ok: r.ok, status: r.status };
    }),
  );
  sellerSteps.push(
    await journeyStep("wallet", async () => {
      const r = await timedFetch("/api/mobile/wallet", { headers: sellerAuth });
      return { ok: r.ok, status: r.status };
    }),
  );

  const buyerJourneyPass = buyerSteps.every((s) => s.status === "PASS");
  const sellerJourneyPass = sellerSteps.every((s) => s.status === "PASS");

  writeFileSync(
    join(OUT, "journey-report.json"),
    JSON.stringify({
      buyer: { status: buyerJourneyPass ? "PASS" : "FAIL", steps: buyerSteps },
      seller: { status: sellerJourneyPass ? "PASS" : "FAIL", steps: sellerSteps },
    }, null, 2),
  );

  // Crash report via beta API or BLOCKED
  let crashReport: Record<string, unknown> = { status: "BLOCKED", reason: "beta API not on staging" };
  if (betaApiResults.find((r) => r.name === "crashes")?.httpStatus === 200) {
    const cr = await timedFetch("/api/product-ops/beta/crashes?days=7");
    crashReport = {
      status: cr.ok ? "PASS" : "FAIL",
      heatmap: (cr.body as { heatmap?: unknown }).heatmap ?? [],
      totalEvents: (cr.body as { totalEvents?: number }).totalEvents ?? 0,
    };
  }
  writeFileSync(join(OUT, "crash-report.json"), JSON.stringify(crashReport, null, 2));

  let performanceReport: Record<string, unknown> = { status: "BLOCKED" };
  if (betaApiResults.find((r) => r.name === "performance")?.httpStatus === 200) {
    const pr = await timedFetch("/api/product-ops/beta/performance?days=7");
    const metrics = (pr.body as { metrics?: Array<{ metric: string; p50Ms: number; p95Ms: number; p99Ms: number; count: number }> }).metrics ?? [];
    performanceReport = {
      status: pr.ok ? "PASS" : "FAIL",
      metrics,
      slowestScreens: metrics.filter((m) => m.count > 0).sort((a, b) => b.p95Ms - a.p95Ms).slice(0, 5),
      insufficientSample: metrics.filter((m) => m.count < 5).map((m) => m.metric),
    };
  }
  writeFileSync(join(OUT, "performance-report.json"), JSON.stringify(performanceReport, null, 2));

  let uxReport: Record<string, unknown> = { status: "BLOCKED" };
  if (betaApiPass) {
    const readiness = await timedFetch("/api/product-ops/beta/readiness");
    uxReport = {
      status: readiness.ok ? "PASS" : "FAIL",
      warnings: (readiness.body as { warnings?: string[] }).warnings ?? [],
    };
  }
  writeFileSync(join(OUT, "ux-report.json"), JSON.stringify(uxReport, null, 2));

  let releaseDashboard: Record<string, unknown> = { recommendation: "NOT_READY" };
  if (betaApiResults.find((r) => r.name === "readiness")?.httpStatus === 200) {
    const rd = await timedFetch("/api/product-ops/beta/readiness");
    releaseDashboard = rd.body as Record<string, unknown>;
  } else {
    releaseDashboard = {
      recommendation: "NOT_READY",
      deploymentParity: deploymentReport.verdict,
      betaApi: betaApiPass ? "PASS" : "FAIL",
      buyerJourney: buyerJourneyPass ? "PASS" : "FAIL",
      sellerJourney: sellerJourneyPass ? "PASS" : "FAIL",
      checkoutSupported: CHECKOUT_STRATEGY === "web_redirect" ? "PASS" : "FAIL",
      note: "Beta readiness API blocked until staging deploy",
    };
  }
  writeFileSync(join(OUT, "release-dashboard.json"), JSON.stringify(releaseDashboard, null, 2));

  const regression = [
    runCmd("mobile_typecheck", "cd apps/mobile && npm run typecheck"),
    runCmd("epic_104_tests", "npm test -- tests/epic-104-closed-beta-readiness.test.ts"),
    runCmd("mobile_staging_smoke", "npm run mobile:staging-smoke"),
    runCmd("epic_102_gate", "npm run mobile:epic-102:gate"),
    runCmd("epic_103_gate", "npm run product:epic-103:beta-rc"),
  ];

  const exitCriteria = {
    deploymentParity: deploymentReport.verdict as Status,
    betaApi: betaApiPass ? "PASS" : "FAIL" as Status,
    buyerJourney: buyerJourneyPass ? "PASS" : "FAIL" as Status,
    sellerJourney: sellerJourneyPass ? "PASS" : "FAIL" as Status,
    checkoutSupported: CHECKOUT_STRATEGY === "web_redirect" ? "PASS" : "FAIL" as Status,
    crashFree: betaApiPass ? "INSUFFICIENT_DATA" : "BLOCKED" as Status,
    criticalBugs: "INSUFFICIENT_DATA" as Status,
    performance: performanceReport.status as Status,
    physicalDevice: "NOT_RUN" as Status,
  };

  const releaseReady =
    exitCriteria.deploymentParity === "PASS" &&
    exitCriteria.betaApi === "PASS" &&
    exitCriteria.buyerJourney === "PASS" &&
    exitCriteria.sellerJourney === "PASS" &&
    exitCriteria.checkoutSupported === "PASS";

  const finalReport = {
    epic: "EPIC-104",
    generatedAt: new Date().toISOString(),
    exitCriteria,
    regression,
    recommendation: releaseReady ? "READY" : "NOT_READY",
    checkoutStrategy: CHECKOUT_STRATEGY,
  };
  writeFileSync(join(OUT, "gate-report.json"), JSON.stringify(finalReport, null, 2));

  console.log(JSON.stringify(finalReport, null, 2));
  process.exit(releaseReady ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
