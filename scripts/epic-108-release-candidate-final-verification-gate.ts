#!/usr/bin/env tsx
/**
 * EPIC-108 — Release Candidate Final Verification
 * Evidence only. Exits 1 when verdict is NOT_READY_FOR_CLOSED_BETA.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { MOBILE_API_VERSION } from "@/lib/mobile/api-contract";
import { CHECKOUT_STRATEGY } from "@/lib/mobile/checkout-handoff";
import { countTelemetrySince } from "@/lib/product-operations/telemetry";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = join(process.cwd(), "artifacts/epic-108");
const BUYER_EMAIL = process.env.MOBILE_TEST_EMAIL ?? "buyer@demo.lot";
const BUYER_PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const SELLER_EMAIL = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const SELLER_PASSWORD = process.env.MOBILE_SELLER_PASSWORD ?? "demo1234";

type Status = "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN" | "INSUFFICIENT_DATA";
type AreaStatus = Status;

async function timedFetch(path: string, init?: RequestInit) {
  const start = Date.now();
  const res = await fetch(`${STAGING}${path}`, { ...init, signal: AbortSignal.timeout(25000) });
  const bodyText = await res.text();
  let body: unknown = {};
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = { raw: bodyText.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, body, latencyMs: Date.now() - start };
}

async function login(email: string, password: string, deviceId: string) {
  return timedFetch("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password, deviceId }),
  });
}

function sh(cmd: string): string {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function fileOnRef(ref: string, path: string): boolean {
  try {
    sh(`git cat-file -e ${ref}:${path}`);
    return true;
  } catch {
    return false;
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

function areaFromStatus(s: Status): AreaStatus {
  if (s === "PASS") return "PASS";
  return "FAIL";
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const originMain = sh("git rev-parse origin/main");
  const localMain = sh("git rev-parse main");
  const head = sh("git rev-parse HEAD");
  const mainMatches = originMain === localMain;

  const epicCommits = [
    { pr: 124, sha: "5303e56" },
    { pr: 125, sha: "81082c4" },
    { pr: 126, sha: "b028271" },
    { pr: 127, sha: "134f035" },
    { pr: 128, sha: "3fd23bc" },
  ];
  const prMergeStatus = epicCommits.map((e) => {
    const full = sh(`git rev-parse ${e.sha}`);
    const onMain =
      sh(`git merge-base --is-ancestor ${full} origin/main && echo YES || echo NO`) === "YES";
    return { pr: e.pr, commit: full.slice(0, 7), mergedToMain: onMain };
  });
  const allPrsMerged = prMergeStatus.every((p) => p.mergedToMain);
  const betaReadinessOnMain = fileOnRef("origin/main", "app/api/product-ops/beta/readiness/route.ts");
  const checkoutOnMain = fileOnRef("origin/main", "app/api/mobile/checkout/web-url/route.ts");

  const preconditions = {
    generatedAt: new Date().toISOString(),
    localMain,
    originMain,
    head,
    mainMatchesOriginMain: mainMatches,
    allPrsMerged,
    prMergeStatus,
    betaRoutesOnMain: betaReadinessOnMain,
    checkoutRouteOnMain: checkoutOnMain,
    verdict: mainMatches && allPrsMerged && betaReadinessOnMain ? "PASS" : "FAIL",
    failReasons: [
      !mainMatches ? "local main !== origin/main" : null,
      !allPrsMerged ? "PR #124–#128 not merged into main" : null,
      !betaReadinessOnMain ? "beta/readiness route missing on origin/main" : null,
    ].filter(Boolean),
  };

  const versionRes = await timedFetch("/api/version");
  const stagingBody = versionRes.body as {
    commit?: string;
    buildTime?: string;
    version?: string;
    environment?: string;
  };
  const stagingSha = String(stagingBody.commit ?? "").slice(0, 7);
  const githubMainSha = originMain.slice(0, 7);
  const shaMatch = stagingSha === githubMainSha;

  const deploymentReport = {
    generatedAt: new Date().toISOString(),
    preconditions,
    github: { mainSha: originMain, shortSha: githubMainSha },
    railway: {
      url: STAGING,
      commit: stagingBody.commit,
      buildTime: stagingBody.buildTime,
      version: stagingBody.version,
      environment: stagingBody.environment,
      httpStatus: versionRes.status,
    },
    chain: "GitHub main → Railway → /api/version",
    shaMatch,
    verdict: shaMatch && preconditions.verdict === "PASS" ? "PASS" : "FAIL",
    evidence: shaMatch
      ? "SHAs match"
      : `GitHub main ${githubMainSha} ≠ staging ${stagingSha}`,
  };
  writeFileSync(join(OUT, "deployment-report.json"), JSON.stringify(deploymentReport, null, 2));

  const betaPaths = [
    { name: "dashboard", path: "/api/product-ops/beta/dashboard" },
    { name: "journey", path: "/api/product-ops/beta/journey" },
    { name: "performance", path: "/api/product-ops/beta/performance" },
    { name: "crashes", path: "/api/product-ops/beta/crashes" },
    { name: "readiness", path: "/api/product-ops/beta/readiness" },
    { name: "exit_report", path: "/api/product-ops/beta/exit-report" },
  ];

  const betaApiResults = [];
  let betaApiPass = true;
  for (const route of betaPaths) {
    const res = await timedFetch(route.path);
    const schemaOk =
      res.status === 200 &&
      (res.body as { apiVersion?: string }).apiVersion === MOBILE_API_VERSION;
    if (res.status !== 200) betaApiPass = false;
    betaApiResults.push({
      name: route.name,
      path: route.path,
      httpStatus: res.status,
      latencyMs: res.latencyMs,
      schemaOk,
      responsePreview:
        res.status !== 200
          ? JSON.stringify(res.body).slice(0, 300)
          : { keys: Object.keys(res.body as object).slice(0, 12) },
    });
  }
  const betaApiReport = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    routes: betaApiResults,
    verdict: betaApiPass ? "PASS" : "FAIL",
  };
  writeFileSync(join(OUT, "beta-api-report.json"), JSON.stringify(betaApiReport, null, 2));

  const buyerLogin = await login(BUYER_EMAIL, BUYER_PASSWORD, "epic108-buyer");
  const sellerLogin = await login(SELLER_EMAIL, SELLER_PASSWORD, "epic108-seller");
  const buyerToken = (buyerLogin.body as { accessToken?: string }).accessToken;
  const sellerToken = (sellerLogin.body as { accessToken?: string }).accessToken;
  const buyerAuth = buyerToken ? { Authorization: `Bearer ${buyerToken}` } : {};
  const sellerAuth = sellerToken ? { Authorization: `Bearer ${sellerToken}` } : {};

  let checkoutVerdict: Status = "FAIL";
  let checkoutReport: Record<string, unknown> = { verdict: "FAIL", strategy: CHECKOUT_STRATEGY };
  if (buyerToken) {
    const webUrl = await timedFetch("/api/mobile/checkout/web-url", { headers: buyerAuth });
    const handoffUrl = (webUrl.body as { handoffUrl?: string }).handoffUrl;
    let enterStatus = 0;
    let cookieSet = false;
    if (handoffUrl && webUrl.ok) {
      const enter = await fetch(handoffUrl, { redirect: "manual", signal: AbortSignal.timeout(25000) });
      enterStatus = enter.status;
      cookieSet = enter.headers.has("set-cookie");
    }
    const orders = await timedFetch("/api/orders", { headers: buyerAuth });
    checkoutVerdict =
      webUrl.ok &&
      (webUrl.body as { strategy?: string }).strategy === CHECKOUT_STRATEGY &&
      Boolean(handoffUrl) &&
      (enterStatus === 307 || enterStatus === 302 || enterStatus === 200) &&
      orders.ok
        ? "PASS"
        : "FAIL";
    checkoutReport = {
      verdict: checkoutVerdict,
      strategy: CHECKOUT_STRATEGY,
      webUrlHttpStatus: webUrl.status,
      webUrlLatencyMs: webUrl.latencyMs,
      handoffUrlPresent: Boolean(handoffUrl),
      enterRedirectStatus: enterStatus,
      sessionCookieSet: cookieSet,
      returnDeepLink: (webUrl.body as { returnDeepLink?: string }).returnDeepLink,
      ordersHttpStatus: orders.status,
      responseOn404: webUrl.status !== 200 ? webUrl.body : undefined,
    };
  }
  const buyerSteps = [];
  buyerSteps.push(await journeyStep("login", async () => ({ ok: buyerLogin.ok && Boolean(buyerToken) })));
  buyerSteps.push(
    await journeyStep("home", async () => {
      const r = await timedFetch("/api/mobile/buyer/home", { headers: buyerAuth });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  buyerSteps.push(
    await journeyStep("catalog", async () => {
      const r = await timedFetch("/api/mobile/catalog/products?limit=5", { headers: buyerAuth });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  let productId = "";
  buyerSteps.push(
    await journeyStep("pdp", async () => {
      const r = await timedFetch("/api/mobile/catalog/products?limit=1", { headers: buyerAuth });
      productId = ((r.body as { items?: Array<{ id?: string }> }).items ?? [])[0]?.id ?? "";
      return { ok: r.ok && Boolean(productId), detail: productId ? undefined : "no product" };
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
    await journeyStep("checkout", async () => ({
      ok: checkoutVerdict === "PASS",
      detail: checkoutVerdict === "PASS" ? undefined : String(checkoutReport.webUrlHttpStatus),
    })),
  );
  buyerSteps.push(
    await journeyStep("orders", async () => {
      const r = await timedFetch("/api/orders", { headers: buyerAuth });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  buyerSteps.push(
    await journeyStep("wallet", async () => {
      const r = await timedFetch("/api/mobile/wallet", { headers: buyerAuth });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  const buyerPass = buyerSteps.every((s) => s.status === "PASS");
  writeFileSync(
    join(OUT, "buyer-journey.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        verdict: buyerPass ? "PASS" : "FAIL",
        steps: buyerSteps,
        totalDurationMs: buyerSteps.reduce((a, s) => a + s.durationMs, 0),
      },
      null,
      2,
    ),
  );

  const sellerSteps = [];
  sellerSteps.push(await journeyStep("login", async () => ({ ok: sellerLogin.ok && Boolean(sellerToken) })));
  sellerSteps.push(
    await journeyStep("workspace", async () => {
      const r = await timedFetch("/api/mobile/seller/home", { headers: sellerAuth });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  let sellerProductId = "";
  sellerSteps.push(
    await journeyStep("products", async () => {
      const r = await timedFetch("/api/mobile/seller/products?limit=5", { headers: sellerAuth });
      const items = (r.body as { items?: Array<{ id?: string }> }).items ?? [];
      sellerProductId = items[0]?.id ?? "";
      return { ok: r.ok && items.length > 0, detail: String(r.status) };
    }),
  );
  sellerSteps.push(
    await journeyStep("editor", async () => {
      if (!sellerProductId) return { ok: false, detail: "no product" };
      const r = await timedFetch(`/api/products/${sellerProductId}`, { headers: sellerAuth });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  sellerSteps.push(
    await journeyStep("inventory", async () => {
      const r = await timedFetch("/api/mobile/seller/products?limit=5", { headers: sellerAuth });
      const items = (r.body as { items?: Array<{ stock?: number }> }).items ?? [];
      return {
        ok: r.ok && items.some((i) => typeof i.stock === "number"),
        detail: String(r.status),
      };
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
      const intel = (r.body as { intelligence?: unknown }).intelligence;
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
      const refresh = (sellerLogin.body as { refreshToken?: string }).refreshToken;
      if (!refresh) return { ok: false, detail: "no refresh" };
      const r = await timedFetch("/api/mobile/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      return { ok: r.ok, detail: String(r.status) };
    }),
  );
  const sellerPass = sellerSteps.every((s) => s.status === "PASS");
  writeFileSync(
    join(OUT, "seller-journey.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        verdict: sellerPass ? "PASS" : "FAIL",
        steps: sellerSteps,
        totalDurationMs: sellerSteps.reduce((a, s) => a + s.durationMs, 0),
      },
      null,
      2,
    ),
  );

  const telemetryPost = await timedFetch("/api/mobile/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appVersion: "0.1.2-alpha",
      platform: "android",
      sessionId: "epic108-obs",
      deviceId: "epic108-obs",
      versionCode: 3,
      screen: "epic108_gate",
      event: "gate_probe",
    }),
  });
  const feedbackPost = await timedFetch("/api/product-ops/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: "EPIC-108 observability probe",
      screen: "epic108_gate",
      category: "other",
      deviceId: "epic108-obs",
    }),
  });

  const observabilityReport = {
    generatedAt: new Date().toISOString(),
    telemetry: { httpStatus: telemetryPost.status, verdict: telemetryPost.ok ? "PASS" : "FAIL" },
    feedback: { httpStatus: feedbackPost.status, verdict: feedbackPost.ok ? "PASS" : "FAIL" },
    crashApi: betaApiResults.find((r) => r.name === "crashes"),
    performanceApi: betaApiResults.find((r) => r.name === "performance"),
    journeyApi: betaApiResults.find((r) => r.name === "journey"),
    dashboardApi: betaApiResults.find((r) => r.name === "dashboard"),
    exitReportApi: betaApiResults.find((r) => r.name === "exit_report"),
    verdict:
      telemetryPost.ok &&
      feedbackPost.ok &&
      betaApiResults.find((r) => r.name === "crashes")?.httpStatus === 200 &&
      betaApiResults.find((r) => r.name === "performance")?.httpStatus === 200 &&
      betaApiResults.find((r) => r.name === "journey")?.httpStatus === 200 &&
      betaApiResults.find((r) => r.name === "dashboard")?.httpStatus === 200 &&
      betaApiResults.find((r) => r.name === "exit_report")?.httpStatus === 200
        ? "PASS"
        : "FAIL",
  };
  writeFileSync(join(OUT, "observability-report.json"), JSON.stringify(observabilityReport, null, 2));

  let releaseGatesReport: Record<string, unknown> = { verdict: "BLOCKED", reason: "Beta APIs not deployed" };
  if (betaApiPass && process.env.DATABASE_URL) {
    try {
      const readiness = await timedFetch("/api/product-ops/beta/readiness");
      const body = readiness.body as {
        releaseGates?: { verdict?: string; rows?: unknown[] };
        criticalBugs?: number;
        crashFreePercent?: number;
      };
      releaseGatesReport = {
        verdict: readiness.ok && body.releaseGates?.verdict === "PASS" ? "PASS" : "FAIL",
        readinessVerdict: body.releaseGates?.verdict,
        rows: body.releaseGates?.rows ?? [],
        criticalBugs: body.criticalBugs,
        crashFreePercent: body.crashFreePercent,
      };
    } catch (err) {
      releaseGatesReport = { verdict: "FAIL", error: String(err) };
    }
  } else if (betaApiPass) {
    releaseGatesReport = { verdict: "INSUFFICIENT_DATA", reason: "DATABASE_URL not set locally" };
  }
  writeFileSync(join(OUT, "release-gates.json"), JSON.stringify(releaseGatesReport, null, 2));

  let dashboardReport: Record<string, unknown> = { verdict: "BLOCKED" };
  if (betaApiPass) {
    const dash = await timedFetch("/api/product-ops/beta/dashboard");
    const readiness = await timedFetch("/api/product-ops/beta/readiness");
    const dashBody = dash.ok ? (dash.body as Record<string, unknown>) : null;
    const snap = readiness.ok
      ? (readiness.body as { snapshot?: Record<string, unknown> }).snapshot
      : null;
    const dashCrash = Number(dashBody?.crashFreeSessions ?? -1);
    const snapCrash = Number(snap?.crashFreeSessions ?? -1);
    dashboardReport = {
      verdict:
        dash.ok &&
        readiness.ok &&
        dashCrash === snapCrash &&
        !String(JSON.stringify(dashBody)).includes("placeholder")
          ? "PASS"
          : "FAIL",
      dashboardHttpStatus: dash.status,
      readinessHttpStatus: readiness.status,
      crashFreeParity: dashCrash === snapCrash,
      dashboardCrashFree: dashCrash,
      readinessCrashFree: snapCrash,
      placeholderDetected: false,
    };
  }
  writeFileSync(join(OUT, "dashboard-report.json"), JSON.stringify(dashboardReport, null, 2));

  let performanceReport: Record<string, unknown> = { verdict: "BLOCKED" };
  if (betaApiPass) {
    const perf = await timedFetch("/api/product-ops/beta/performance?days=7");
    const metrics =
      (perf.body as { metrics?: Array<{ metric: string; p50Ms: number; p95Ms: number; p99Ms: number }> })
        .metrics ?? [];
    const wanted = ["cold_start", "catalog", "pdp", "seller_home", "orders", "inventory", "promotion"];
    const byMetric = Object.fromEntries(metrics.map((m) => [m.metric, m]));
    performanceReport = {
      verdict: perf.ok ? "PASS" : "FAIL",
      httpStatus: perf.status,
      metrics,
      p50P95P99: metrics.map((m) => ({
        metric: m.metric,
        p50: m.p50Ms,
        p95: m.p95Ms,
        p99: m.p99Ms,
      })),
      wantedMetricsPresent: wanted.filter((w) => byMetric[w] || metrics.some((m) => m.metric.includes(w))),
      insufficientSample: metrics.filter((m) => m.p50Ms === 0 && m.p95Ms === 0).map((m) => m.metric),
    };
  }
  writeFileSync(join(OUT, "performance-report.json"), JSON.stringify(performanceReport, null, 2));

  const crashObsPass =
    observabilityReport.crashApi?.httpStatus === 200 ? "PASS" : ("FAIL" as Status);
  const perfObsPass =
    observabilityReport.performanceApi?.httpStatus === 200 ? "PASS" : ("FAIL" as Status);
  const telemetryPass = observabilityReport.telemetry.verdict === "PASS" ? "PASS" : ("FAIL" as Status);

  const failedCriteria: Array<{
    criterion: string;
    evidence: string;
    rootCause: string;
    severity: string;
    recommendedFix: string;
  }> = [];

  if (deploymentReport.verdict !== "PASS") {
    failedCriteria.push({
      criterion: "Deployment SHA parity / preconditions",
      evidence: JSON.stringify({
        shaMatch,
        githubMainSha,
        stagingSha,
        preconditions: preconditions.failReasons,
      }),
      rootCause: !allPrsMerged
        ? "PR #124–#128 not merged into main; beta code not on origin/main"
        : !shaMatch
          ? `staging ${stagingSha} ≠ main ${githubMainSha}`
          : "preconditions failed",
      severity: "P0",
      recommendedFix: "Merge PR #124–#128 into main and redeploy Railway",
    });
  }
  if (!betaApiPass) {
    failedCriteria.push({
      criterion: "Beta API HTTP 200",
      evidence: JSON.stringify(betaApiResults.map((r) => ({ path: r.path, status: r.httpStatus }))),
      rootCause: "Beta route files absent from deployed main commit",
      severity: "P0",
      recommendedFix: "Merge EPIC 102–106 PRs and redeploy",
    });
  }
  if (checkoutVerdict !== "PASS") {
    failedCriteria.push({
      criterion: "Checkout handoff",
      evidence: JSON.stringify(checkoutReport),
      rootCause: checkoutReport.webUrlHttpStatus === 404 ? "checkout/web-url not deployed" : "handoff chain failed",
      severity: "P0",
      recommendedFix: "Merge EPIC 104 and redeploy",
    });
  }
  if (!buyerPass) {
    failedCriteria.push({
      criterion: "Buyer journey",
      evidence: JSON.stringify(buyerSteps.filter((s) => s.status !== "PASS")),
      rootCause: "Checkout step fails when web-url 404",
      severity: "P1",
      recommendedFix: "Fix deployment parity first",
    });
  }

  const summaryTable = {
    Deployment: areaFromStatus(deploymentReport.verdict as Status),
    "Buyer Journey": buyerPass ? "PASS" : "FAIL",
    "Seller Journey": sellerPass ? "PASS" : "FAIL",
    "Beta API": betaApiPass ? "PASS" : "FAIL",
    Checkout: checkoutVerdict === "PASS" ? "PASS" : "FAIL",
    Dashboard: (dashboardReport.verdict as string) === "PASS" ? "PASS" : "FAIL",
    Telemetry: telemetryPass,
    "Crash Observatory": crashObsPass,
    Performance: perfObsPass,
    "Final Verdict": "" as string,
  };

  const ready =
    deploymentReport.verdict === "PASS" &&
    betaApiPass &&
    checkoutVerdict === "PASS" &&
    buyerPass &&
    sellerPass &&
    observabilityReport.verdict === "PASS" &&
    (dashboardReport.verdict as string) === "PASS" &&
    (releaseGatesReport.verdict as string) === "PASS" &&
    failedCriteria.filter((f) => f.severity === "P0").length === 0;

  const finalVerdictStr = ready ? "READY_FOR_CLOSED_BETA" : "NOT_READY_FOR_CLOSED_BETA";
  summaryTable["Final Verdict"] = finalVerdictStr;

  const finalVerdict = {
    generatedAt: new Date().toISOString(),
    verdict: finalVerdictStr,
    summaryTable,
    failedCriteria,
    preconditions,
  };
  writeFileSync(join(OUT, "final-verdict.json"), JSON.stringify(finalVerdict, null, 2));

  console.log(JSON.stringify({ summaryTable, verdict: finalVerdictStr, failedCriteria }, null, 2));
  process.exit(ready ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
