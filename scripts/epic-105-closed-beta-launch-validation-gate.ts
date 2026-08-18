#!/usr/bin/env tsx
/**
 * EPIC-105 — Closed Beta Launch Validation
 * Evidence only. Exits 1 when any launch criterion is not satisfied.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { MOBILE_API_VERSION } from "@/lib/mobile/api-contract";
import { CHECKOUT_STRATEGY } from "@/lib/mobile/checkout-handoff";
import { countTelemetrySince } from "@/lib/product-operations/telemetry";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = join(process.cwd(), "artifacts/epic-105");
const BUYER_EMAIL = process.env.MOBILE_TEST_EMAIL ?? "buyer@demo.lot";
const BUYER_PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const SELLER_EMAIL = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const SELLER_PASSWORD = process.env.MOBILE_SELLER_PASSWORD ?? "demo1234";

type Status = "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN" | "INSUFFICIENT_DATA";

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

async function journeyStep(
  step: string,
  fn: () => Promise<{ ok: boolean; detail?: string }>,
): Promise<{ step: string; status: Status; durationMs: number; error?: string }> {
  const start = Date.now();
  try {
    const r = await fn();
    return {
      step,
      status: r.ok ? "PASS" : "FAIL",
      durationMs: Date.now() - start,
      error: r.ok ? undefined : r.detail,
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

  const configRes = await timedFetch("/api/product-ops/config?surface=mobile&deviceId=epic105");
  const flags = (configRes.body as { flags?: Array<{ key: string; enabled: boolean; stage?: string }> }).flags ?? [];

  const betaModuleChecks = [
    "lib/product-operations/beta/index.ts",
    "lib/mobile/checkout-handoff.ts",
    "app/api/product-ops/beta/dashboard/route.ts",
    "app/api/product-ops/beta/performance/route.ts",
    "app/api/product-ops/beta/crashes/route.ts",
    "app/api/product-ops/beta/readiness/route.ts",
    "app/api/mobile/checkout/web-url/route.ts",
  ].map((p) => ({ path: p, exists: existsSync(join(process.cwd(), p)) }));

  const deploymentValidation = {
    generatedAt: new Date().toISOString(),
    candidate: { commit, branch, appVersion, versionCode, apiVersion: MOBILE_API_VERSION },
    staging: { url: STAGING, commit: stagingSha, httpStatus: versionRes.status },
    checks: {
      commitShaParity: stagingSha === candidateSha,
      buildVersion: appVersion,
      apiVersion: MOBILE_API_VERSION,
      featureFlagsLoaded: flags.length > 0,
      betaModulesPresent: betaModuleChecks.every((m) => m.exists),
    },
    betaModules: betaModuleChecks,
    verdict: stagingSha === candidateSha && betaModuleChecks.every((m) => m.exists) ? "PASS" : "FAIL",
    failReason:
      stagingSha !== candidateSha
        ? `Staging commit ${stagingSha} does not match candidate ${candidateSha} — deploy required`
        : undefined,
  };
  writeFileSync(join(OUT, "deployment-validation.json"), JSON.stringify(deploymentValidation, null, 2));

  if (deploymentValidation.verdict === "FAIL") {
    console.error("[EPIC-105] Deployment validation FAIL — aborting further checks that require deployed candidate");
  }

  const betaRoutes = [
    { name: "dashboard", path: "/api/product-ops/beta/dashboard" },
    { name: "journey", path: "/api/product-ops/beta/journey" },
    { name: "performance", path: "/api/product-ops/beta/performance" },
    { name: "crashes", path: "/api/product-ops/beta/crashes" },
    { name: "readiness", path: "/api/product-ops/beta/readiness" },
    { name: "exit_report", path: "/api/product-ops/beta/exit-report" },
  ];

  const betaApiResults = [];
  let betaApiPass = true;
  for (const route of betaRoutes) {
    const unauth = await timedFetch(route.path);
    const schemaOk =
      unauth.ok &&
      (unauth.body as { apiVersion?: string }).apiVersion === MOBILE_API_VERSION;
    if (!unauth.ok || unauth.status === 404 || unauth.status >= 500) betaApiPass = false;

    const authProbe = await timedFetch(route.path, {
      headers: { Authorization: "Bearer invalid-token-epic105" },
    });

    betaApiResults.push({
      name: route.name,
      path: route.path,
      httpStatus: unauth.status,
      latencyMs: unauth.latencyMs,
      schemaOk,
      authBehavior: authProbe.status,
      emptyStateOk: unauth.ok,
    });
  }
  const buyerLogin = await login(BUYER_EMAIL, BUYER_PASSWORD, "epic105-buyer");
  const sellerLogin = await login(SELLER_EMAIL, SELLER_PASSWORD, "epic105-seller");
  const buyerToken = (buyerLogin.body as { accessToken?: string }).accessToken;
  const buyerRefresh = (buyerLogin.body as { refreshToken?: string }).refreshToken;
  const sellerToken = (sellerLogin.body as { accessToken?: string }).accessToken;
  const sellerRefresh = (sellerLogin.body as { refreshToken?: string }).refreshToken;
  const buyerAuth = buyerToken ? { Authorization: `Bearer ${buyerToken}` } : {};
  const sellerAuth = sellerToken ? { Authorization: `Bearer ${sellerToken}` } : {};

  const buyerSteps = [];
  buyerSteps.push(await journeyStep("login", async () => ({ ok: buyerLogin.ok && Boolean(buyerToken) })));
  buyerSteps.push(
    await journeyStep("search_catalog", async () => {
      const r = await timedFetch("/api/mobile/catalog/products?limit=5&q=drill", { headers: buyerAuth });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  let productId = "";
  buyerSteps.push(
    await journeyStep("pdp_catalog", async () => {
      const r = await timedFetch("/api/mobile/catalog/products?limit=1", { headers: buyerAuth });
      productId = ((r.body as { items?: Array<{ id?: string }> }).items ?? [])[0]?.id ?? "";
      return { ok: r.ok && Boolean(productId), detail: productId ? undefined : "no product" };
    }),
  );
  buyerSteps.push(
    await journeyStep("pdp_detail", async () => {
      if (!productId) return { ok: false, detail: "no product" };
      const r = await timedFetch(`/api/products/${productId}`, { headers: buyerAuth });
      return { ok: r.ok, detail: String(r.status) };
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
      return { ok: r.ok, detail: String(r.status) };
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
      return { ok: r.ok || r.status === 201, detail: String(r.status) };
    }),
  );
  buyerSteps.push(
    await journeyStep("checkout_redirect_api", async () => {
      const r = await timedFetch("/api/mobile/checkout/web-url", { headers: buyerAuth });
      const strategy = (r.body as { strategy?: string }).strategy;
      return { ok: r.ok && strategy === CHECKOUT_STRATEGY, detail: r.ok ? strategy : String(r.status) };
    }),
  );
  buyerSteps.push(
    await journeyStep("orders", async () => {
      const r = await timedFetch("/api/orders", { headers: buyerAuth });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  buyerSteps.push(
    await journeyStep("logout", async () => {
      if (!buyerRefresh) return { ok: false, detail: "no refresh token" };
      const r = await timedFetch("/api/mobile/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: buyerRefresh }),
      });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );

  const sellerSteps = [];
  sellerSteps.push(await journeyStep("login", async () => ({ ok: sellerLogin.ok && Boolean(sellerToken) })));
  let sellerProductId = "";
  sellerSteps.push(
    await journeyStep("workspace", async () => {
      const r = await timedFetch("/api/mobile/seller/home", { headers: sellerAuth });
      const body = r.body as {
        promotion?: { active?: number };
        intelligence?: { topAction?: string | null };
        orders?: { needAction?: number };
      };
      const promotionOk = typeof body.promotion?.active === "number";
      const intelligenceOk = body.intelligence !== undefined;
      return {
        ok: r.ok && promotionOk && intelligenceOk,
        detail: r.ok ? undefined : String(r.status),
      };
    }),
  );
  sellerSteps.push(
    await journeyStep("products", async () => {
      const r = await timedFetch("/api/mobile/seller/products?limit=5", { headers: sellerAuth });
      const items = (r.body as { items?: Array<{ id?: string; stock?: number }> }).items ?? [];
      sellerProductId = items[0]?.id ?? "";
      return { ok: r.ok && items.length > 0, detail: r.ok ? undefined : String(r.status) };
    }),
  );
  sellerSteps.push(
    await journeyStep("product_editor", async () => {
      if (!sellerProductId) return { ok: false, detail: "no seller product" };
      const r = await timedFetch(`/api/products/${sellerProductId}`, { headers: sellerAuth });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  sellerSteps.push(
    await journeyStep("inventory", async () => {
      const r = await timedFetch("/api/mobile/seller/products?limit=5", { headers: sellerAuth });
      const items = (r.body as { items?: Array<{ stock?: number }> }).items ?? [];
      const hasStockField = items.some((i) => typeof i.stock === "number");
      return { ok: r.ok && hasStockField, detail: hasStockField ? undefined : "stock field missing" };
    }),
  );
  sellerSteps.push(
    await journeyStep("orders", async () => {
      const r = await timedFetch("/api/orders", { headers: sellerAuth });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  sellerSteps.push(
    await journeyStep("promotion", async () => {
      const r = await timedFetch("/api/mobile/seller/home", { headers: sellerAuth });
      const active = (r.body as { promotion?: { active?: number } }).promotion?.active;
      return { ok: r.ok && typeof active === "number", detail: String(r.status) };
    }),
  );
  sellerSteps.push(
    await journeyStep("intelligence", async () => {
      const r = await timedFetch("/api/mobile/seller/home", { headers: sellerAuth });
      const intel = (r.body as { intelligence?: { topAction?: string | null } }).intelligence;
      return { ok: r.ok && intel !== undefined, detail: String(r.status) };
    }),
  );
  sellerSteps.push(
    await journeyStep("wallet", async () => {
      const r = await timedFetch("/api/mobile/wallet", { headers: sellerAuth });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  sellerSteps.push(
    await journeyStep("logout", async () => {
      if (!sellerRefresh) return { ok: false, detail: "no refresh token" };
      const r = await timedFetch("/api/mobile/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: sellerRefresh }),
      });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );

  const buyerApiPass = buyerSteps.every((s) => s.status === "PASS");
  const sellerApiPass = sellerSteps.every((s) => s.status === "PASS");

  const physicalDeviceReport = {
    generatedAt: new Date().toISOString(),
    verdict: "NOT_RUN" as Status,
    reason:
      "Physical Android validation requires operator device — cloud agent cannot produce screenshots, recordings, or logcat",
    requiredEvidence: [
      "Buyer: login → search → PDP → favorite → cart → checkout redirect → web checkout → return → orders → logout",
      "Seller: login → workspace → products → editor → inventory → orders → promotion → intelligence → wallet → logout",
    ],
    artifactsExpected: ["screenshots/", "screen_recordings/", "logcat.txt", "timing.json"],
    operatorChecklist: "docs/mobile/EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md",
  };
  writeFileSync(join(OUT, "physical-device-report.json"), JSON.stringify(physicalDeviceReport, null, 2));

  let checkoutValidation: Record<string, unknown> = {
    verdict: "FAIL",
    strategy: CHECKOUT_STRATEGY,
    steps: [] as Array<Record<string, unknown>>,
  };

  if (buyerToken) {
    const webUrlStart = Date.now();
    const webUrl = await timedFetch("/api/mobile/checkout/web-url", { headers: buyerAuth });
    const redirectLatencyMs = Date.now() - webUrlStart;
    const handoffUrl = (webUrl.body as { handoffUrl?: string }).handoffUrl;
    let enterStatus = 0;
    let cookieSet = false;
    if (handoffUrl && webUrl.ok) {
      const enter = await fetch(handoffUrl, { redirect: "manual", signal: AbortSignal.timeout(25000) });
      enterStatus = enter.status;
      cookieSet = enter.headers.has("set-cookie");
    }
    checkoutValidation = {
      verdict:
        webUrl.ok &&
        (webUrl.body as { strategy?: string }).strategy === "web_redirect" &&
        Boolean(handoffUrl) &&
        (enterStatus === 307 || enterStatus === 302 || enterStatus === 200)
          ? "PASS"
          : "FAIL",
      strategy: CHECKOUT_STRATEGY,
      redirectLatencyMs,
      webUrlHttpStatus: webUrl.status,
      handoffUrlPresent: Boolean(handoffUrl),
      enterRedirectStatus: enterStatus,
      sessionCookieSet: cookieSet,
      returnDeepLink: (webUrl.body as { returnDeepLink?: string }).returnDeepLink ?? "lot://orders",
      note: "No simulated payment — validates redirect chain only",
    };
  }
  writeFileSync(join(OUT, "checkout-validation.json"), JSON.stringify(checkoutValidation, null, 2));

  let crashValidation: Record<string, unknown> = { verdict: "BLOCKED", reason: "Beta crashes API not deployed" };
  let performanceValidation: Record<string, unknown> = { verdict: "BLOCKED" };
  let uxValidation: Record<string, unknown> = { verdict: "BLOCKED" };
  let dashboardValidation: Record<string, unknown> = { verdict: "BLOCKED" };
  let criticalBugs: Status = "INSUFFICIENT_DATA";

  if (betaApiPass) {
    const perfRes = await timedFetch("/api/product-ops/beta/performance?days=7");
    const metrics =
      (perfRes.body as { metrics?: Array<{ metric: string; p50Ms: number; p95Ms: number; p99Ms: number; count: number }> })
        .metrics ?? [];
    performanceValidation = {
      verdict: perfRes.ok ? "PASS" : "FAIL",
      metrics,
      insufficientSample: metrics.filter((m) => m.count < 5).map((m) => m.metric),
      slowest: metrics.filter((m) => m.count > 0).sort((a, b) => b.p95Ms - a.p95Ms).slice(0, 8),
    };
    writeFileSync(join(OUT, "performance-validation.json"), JSON.stringify(performanceValidation, null, 2));

    const crashRes = await timedFetch("/api/product-ops/beta/crashes?days=7");
    const heatmap = (crashRes.body as { heatmap?: unknown }).heatmap ?? [];
    const totalEvents = (crashRes.body as { totalEvents?: number }).totalEvents ?? 0;
    crashValidation = {
      verdict: crashRes.ok ? "INSUFFICIENT_DATA" : "FAIL",
      heatmap,
      totalEvents,
      crashFreeTarget: 99,
      note: "Crash-free % requires session volume — compute after beta traffic",
    };

    const readiness = await timedFetch("/api/product-ops/beta/readiness");
    const readinessBody = readiness.ok ? (readiness.body as Record<string, unknown>) : null;
    const criticalBugCount = Number(readinessBody?.criticalBugs ?? -1);

    const dash = await timedFetch("/api/product-ops/beta/dashboard");
    const readinessDash = readinessBody?.snapshot as Record<string, unknown> | undefined;
    const dashBody = dash.ok ? (dash.body as Record<string, unknown>) : null;

    const uxRows =
      (readinessBody?.exitReport as { topUx?: unknown } | undefined)?.topUx ??
      (readinessDash?.mostAbandonedFlows as unknown[] | undefined) ??
      [];
    uxValidation = {
      verdict: readiness.ok ? "INSUFFICIENT_DATA" : "FAIL",
      warnings: (readinessBody?.warnings as string[] | undefined) ?? [],
      signals: {
        deadEnds: (readinessDash?.mostAbandonedFlows as unknown[] | undefined) ?? [],
        slowLoading: (readinessDash?.slowestScreens as unknown[] | undefined) ?? [],
        topUxIssues: uxRows,
      },
      note: "UX confusion signals require telemetry volume; physical validation captures taps/back loops",
    };

    const dashCrashFree = Number(dashBody?.crashFreeSessions ?? -1);
    const readinessCrashFree = Number(readinessDash?.crashFreeSessions ?? -1);
    const dashFeedback = dashBody?.mostCommonFeedback;
    const readinessFeedback = readinessDash?.mostCommonFeedback;
    dashboardValidation = {
      verdict:
        dash.ok &&
        readiness.ok &&
        dashCrashFree === readinessCrashFree &&
        JSON.stringify(dashFeedback) === JSON.stringify(readinessFeedback)
          ? "PASS"
          : dash.ok && readiness.ok
            ? "FAIL"
            : "FAIL",
      dashboardCrashFree: dashCrashFree,
      readinessCrashFree,
      crashFreeMatch: dashCrashFree === readinessCrashFree,
      feedbackParity: JSON.stringify(dashFeedback) === JSON.stringify(readinessFeedback),
      note: "Derived metrics must match between dashboard and readiness snapshot",
    };

    if (criticalBugCount >= 0) {
      criticalBugs = criticalBugCount === 0 ? "PASS" : "FAIL";
    }
  } else {
    writeFileSync(join(OUT, "performance-validation.json"), JSON.stringify(performanceValidation, null, 2));
  }
  writeFileSync(join(OUT, "crash-validation.json"), JSON.stringify(crashValidation, null, 2));
  writeFileSync(join(OUT, "ux-validation.json"), JSON.stringify(uxValidation, null, 2));
  writeFileSync(join(OUT, "dashboard-validation.json"), JSON.stringify(dashboardValidation, null, 2));

  let crashFreeStatus: Status = "BLOCKED";
  if (process.env.DATABASE_URL && betaApiPass) {
    try {
      const sessions = await countTelemetrySince(24, ["session_start", "screen_view"]);
      const crashes = await countTelemetrySince(24, ["crash", "js_crash", "unhandled_promise"]);
      const crashFree = sessions > 0 ? Math.round((1 - crashes / sessions) * 1000) / 10 : 0;
      crashValidation.crashFreePercent = crashFree;
      crashValidation.sessions24h = sessions;
      crashValidation.crashes24h = crashes;
      crashFreeStatus =
        sessions < 100 ? "INSUFFICIENT_DATA" : crashFree >= 99 ? "PASS" : "FAIL";
      writeFileSync(join(OUT, "crash-validation.json"), JSON.stringify(crashValidation, null, 2));
    } catch {
      crashFreeStatus = "INSUFFICIENT_DATA";
    }
  }

  const exitCriteria = {
    deploymentParity: deploymentValidation.verdict as Status,
    betaApi: betaApiPass ? "PASS" : "FAIL" as Status,
    buyerJourneyApi: buyerApiPass ? "PASS" : "FAIL" as Status,
    sellerJourneyApi: sellerApiPass ? "PASS" : "FAIL" as Status,
    checkoutRedirect: (checkoutValidation.verdict as string) === "PASS" ? "PASS" : "FAIL" as Status,
    crashFree: crashFreeStatus,
    criticalBugs,
    dashboardAccuracy: (dashboardValidation.verdict as string) === "PASS" ? "PASS" : dashboardValidation.verdict === "BLOCKED" ? "BLOCKED" : "FAIL" as Status,
    physicalValidation: physicalDeviceReport.verdict as Status,
  };

  const launchReady =
    exitCriteria.deploymentParity === "PASS" &&
    exitCriteria.betaApi === "PASS" &&
    exitCriteria.buyerJourneyApi === "PASS" &&
    exitCriteria.sellerJourneyApi === "PASS" &&
    exitCriteria.checkoutRedirect === "PASS" &&
    exitCriteria.crashFree === "PASS" &&
    exitCriteria.criticalBugs === "PASS" &&
    exitCriteria.dashboardAccuracy === "PASS" &&
    exitCriteria.physicalValidation === "PASS";

  const reasons: string[] = [];
  if (exitCriteria.deploymentParity !== "PASS") reasons.push(deploymentValidation.failReason ?? "Deployment parity FAIL");
  if (exitCriteria.betaApi !== "PASS") reasons.push("Beta API routes not HTTP 200 on staging");
  if (exitCriteria.buyerJourneyApi !== "PASS") reasons.push("Buyer API journey steps failed");
  if (exitCriteria.sellerJourneyApi !== "PASS") reasons.push("Seller API journey steps failed");
  if (exitCriteria.checkoutRedirect !== "PASS") reasons.push("Checkout web redirect chain failed");
  if (exitCriteria.physicalValidation !== "PASS") reasons.push("Physical Android validation NOT_RUN");
  if (exitCriteria.crashFree !== "PASS") reasons.push(`Crash-free: ${exitCriteria.crashFree}`);
  if (exitCriteria.criticalBugs !== "PASS") reasons.push(`Critical bugs: ${exitCriteria.criticalBugs}`);
  if (exitCriteria.dashboardAccuracy !== "PASS") reasons.push(`Dashboard accuracy: ${exitCriteria.dashboardAccuracy}`);

  const releaseReadiness = {
    epic: "EPIC-105",
    generatedAt: new Date().toISOString(),
    verdict: launchReady ? "READY_FOR_CLOSED_BETA" : "NOT_READY",
    exitCriteria,
    reasons,
    betaInfrastructure: { verdict: betaApiPass ? "PASS" : "FAIL", routes: betaApiResults },
    buyerJourneyApi: { status: buyerApiPass ? "PASS" : "FAIL", steps: buyerSteps },
    sellerJourneyApi: { status: sellerApiPass ? "PASS" : "FAIL", steps: sellerSteps },
    evidencePrinciple: "Evidence only — never upgrade UNKNOWN/NOT_RUN to PASS",
  };
  writeFileSync(join(OUT, "release-readiness.json"), JSON.stringify(releaseReadiness, null, 2));

  console.log(JSON.stringify(releaseReadiness, null, 2));
  process.exit(launchReady ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
