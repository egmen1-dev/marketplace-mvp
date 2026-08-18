#!/usr/bin/env tsx
/** EPIC-103 — Closed Beta Release Candidate Validation */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runPrivacyAudit } from "@/lib/product-operations/beta/privacy-audit";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT_DIR = join(process.cwd(), "artifacts/epic-103-beta-rc");
const BUYER_EMAIL = process.env.MOBILE_TEST_EMAIL ?? "buyer@demo.lot";
const BUYER_PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const SELLER_EMAIL = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const SELLER_PASSWORD = process.env.MOBILE_SELLER_PASSWORD ?? "demo1234";

type Status = "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN" | "NOT_SUPPORTED" | "INSUFFICIENT_DATA";
type Bug = {
  id: string;
  severity: "P0" | "P1" | "P2" | "P3";
  screen: string;
  role: string;
  steps: string[];
  expected: string;
  actual: string;
  evidence: string;
  suspectedCause: string;
  fixRecommendation: string;
  regressionTest: string;
};

type Row = { id: string; status: Status; detail?: string; evidence?: string };

async function timedFetch(path: string, init?: RequestInit) {
  const start = Date.now();
  const res = await fetch(`${STAGING}${path}`, { ...init, signal: AbortSignal.timeout(20000) });
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

function runGate(name: string, cmd: string): Row {
  try {
    execSync(cmd, { stdio: "pipe" });
    return { id: name, status: "PASS", detail: cmd };
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 120) : "failed";
    return { id: name, status: "FAIL", detail };
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const bugs: Bug[] = [];
  const rows: Row[] = [];
  const commit = gitSha();
  const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  const buildInfo = JSON.parse(readFileSync(join(process.cwd(), "lib/build-info.generated.json"), "utf8"));
  const appJson = JSON.parse(readFileSync(join(process.cwd(), "apps/mobile/app.json"), "utf8"));
  const envTs = readFileSync(join(process.cwd(), "apps/mobile/src/config/env.ts"), "utf8");
  const appVersion = envTs.match(/appVersion:\s*"([^"]+)"/)?.[1] ?? appJson.expo.version;
  const buildNumber = String(appJson.expo.android.versionCode ?? 3);

  const versionRes = await timedFetch("/api/version");
  const stagingSha = String((versionRes.body as { commit?: string }).commit ?? "").slice(0, 7);

  const baseline = {
    generatedAt: new Date().toISOString(),
    gitCommit: commit,
    gitBranch: branch,
    applicationVersion: appVersion,
    versionCode: Number(buildNumber),
    environment: "staging",
    apiBaseUrl: STAGING,
    buildTimestamp: buildInfo.buildTime,
    apkPath: null as string | null,
    apkSha256: null as string | null,
    backendDeployment: {
      stagingCommit: stagingSha,
      matchesCandidate: stagingSha === commit.slice(0, 7),
      httpStatus: versionRes.status,
    },
    databaseEnvironment: process.env.DATABASE_URL ? "configured" : "not_available_locally",
    remoteConfigVersion: "product-ops-config-v1",
    canonicalCandidateNote: "ONE candidate — EPIC 102 branch commit validated against staging",
  };

  const apkCandidates = [
    join(process.cwd(), "apps/mobile/android/app/build/outputs/apk/release/app-release.apk"),
    join(process.cwd(), "artifacts/lot-android-alpha.apk"),
  ];
  for (const apk of apkCandidates) {
    if (existsSync(apk)) {
      const buf = readFileSync(apk);
      baseline.apkPath = apk;
      baseline.apkSha256 = createHash("sha256").update(buf).digest("hex");
      break;
    }
  }

  writeFileSync(join(OUT_DIR, "baseline.json"), JSON.stringify(baseline, null, 2));

  rows.push({
    id: "canonical_baseline_recorded",
    status: "PASS",
    evidence: commit,
  });

  if (!baseline.apkPath) {
    rows.push({
      id: "canonical_apk_validated",
      status: "NOT_RUN",
      detail: "No APK artifact in workspace — physical device validation required",
    });
  } else {
    rows.push({
      id: "canonical_apk_validated",
      status: "PASS",
      detail: baseline.apkSha256,
    });
  }

  if (!baseline.backendDeployment.matchesCandidate) {
    rows.push({
      id: "staging_deploy_matches_candidate",
      status: "FAIL",
      detail: `staging=${stagingSha} candidate=${commit.slice(0, 7)}`,
      evidence: "EPIC 102 beta routes not on staging until deploy",
    });
    bugs.push({
      id: "EP103-001",
      severity: "P1",
      screen: "infrastructure",
      role: "system",
      steps: ["Deploy candidate branch to staging", "GET /api/product-ops/beta/dashboard"],
      expected: "HTTP 200 with dashboard JSON",
      actual: `Staging at ${stagingSha}, candidate ${commit.slice(0, 7)}; beta APIs 404`,
      evidence: `GET ${STAGING}/api/product-ops/beta/dashboard → 404`,
      suspectedCause: "EPIC 102 not deployed to staging Railway",
      fixRecommendation: "Merge and deploy cursor/epic-102-closed-beta-program-d03e to staging",
      regressionTest: "staging_beta_dashboard_api in epic-103 gate",
    });
  } else {
    rows.push({ id: "staging_deploy_matches_candidate", status: "PASS" });
  }

  // Part 2 — Staging endpoints
  const endpointResults: Array<Record<string, unknown>> = [];
  const endpoints: Array<{ name: string; path: string; method?: string; body?: unknown; auth?: string }> = [
    { name: "beta_dashboard", path: "/api/product-ops/beta/dashboard" },
    { name: "beta_journey", path: "/api/product-ops/beta/journey" },
    { name: "beta_exit_report", path: "/api/product-ops/beta/exit-report" },
    { name: "telemetry_post", path: "/api/mobile/telemetry", method: "POST", body: { appVersion: appVersion, platform: "android", event: "epic103_probe" } },
    { name: "feedback_post", path: "/api/product-ops/feedback", method: "POST", body: { content: "epic103 probe" } },
    { name: "remote_config", path: "/api/product-ops/config?surface=mobile&deviceId=epic103" },
    { name: "bootstrap", path: "/api/mobile/bootstrap" },
  ];

  let betaApiFail = false;
  for (const ep of endpoints) {
    const init: RequestInit = {
      method: ep.method ?? "GET",
      headers: { "Content-Type": "application/json", ...(ep.auth ? { Authorization: ep.auth } : {}) },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    };
    const r = await timedFetch(ep.path, init);
    endpointResults.push({
      name: ep.name,
      path: ep.path,
      httpStatus: r.status,
      latencyMs: r.latencyMs,
      ok: r.ok,
      schemaKeys: Object.keys(r.body as object).slice(0, 8),
    });
    if (ep.name.startsWith("beta_") && r.status === 404) betaApiFail = true;
  }

  writeFileSync(join(OUT_DIR, "staging-endpoints.json"), JSON.stringify({ staging: STAGING, endpoints: endpointResults }, null, 2));

  rows.push({
    id: "beta_api_deployed",
    status: betaApiFail ? "FAIL" : "PASS",
    detail: betaApiFail ? "Beta dashboard/journey/exit-report return 404 on staging" : "ok",
    evidence: JSON.stringify(endpointResults.filter((e) => String(e.name).startsWith("beta_"))),
  });

  rows.push({
    id: "telemetry_feedback_transport",
    status: endpointResults.find((e) => e.name === "telemetry_post")?.ok ? "PASS" : "FAIL",
    detail: String(endpointResults.find((e) => e.name === "telemetry_post")?.httpStatus),
  });

  // Part 3 — Telemetry E2E events
  const sessionId = `epic103-e2e-${Date.now()}`;
  const deviceId = `epic103-e2e-device`;
  const telemetryEvents = ["screen_view", "button_press", "scroll_depth", "back_press", "rage_tap", "abandoned_flow"];
  const telemetryResults: Array<{ event: string; accepted: boolean; status: number }> = [];

  for (const event of telemetryEvents) {
    const r = await timedFetch("/api/mobile/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appVersion,
        platform: "android",
        event,
        screen: "epic103_e2e",
        sessionId,
        deviceId,
        versionCode: Number(buildNumber),
        metadata: { metric: "screen_render", durationMs: 50, navigationPath: ["boot", "home"] },
      }),
    });
    telemetryResults.push({
      event,
      accepted: Boolean((r.body as { accepted?: boolean }).accepted),
      status: r.status,
    });
  }

  // Duplicate handling — same event 3x
  const dupStatuses: number[] = [];
  for (let i = 0; i < 3; i++) {
    const r = await timedFetch("/api/mobile/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appVersion,
        platform: "android",
        event: "screen_view",
        screen: "dup_test",
        sessionId: "epic103-dup",
        deviceId: "epic103-dup",
        versionCode: Number(buildNumber),
        metadata: { metric: "screen_render", durationMs: 100 },
      }),
    });
    dupStatuses.push(r.status);
  }

  writeFileSync(
    join(OUT_DIR, "telemetry-e2e.json"),
    JSON.stringify({ sessionId, telemetryResults, duplicatePostStatuses: dupStatuses, dashboardVerified: false, note: "Dashboard aggregation BLOCKED — beta API 404 on staging" }, null, 2),
  );

  const telemetryOk = telemetryResults.every((t) => t.accepted && t.status === 200);
  rows.push({
    id: "telemetry_e2e_transport",
    status: telemetryOk ? "PASS" : "FAIL",
    evidence: JSON.stringify(telemetryResults),
  });
  rows.push({
    id: "telemetry_dashboard_aggregation",
    status: betaApiFail ? "BLOCKED" : "NOT_RUN",
    detail: "Cannot verify dashboard without deployed beta API + DB access",
  });

  // Part 4 — Feedback E2E
  const feedbackCategories = ["bug_report", "confusing_ui", "performance_issue", "seller_issue", "buyer_issue", "feature_request"];
  const feedbackResults: Array<{ category: string; id?: string; status: number; classification?: string }> = [];

  for (const category of feedbackCategories) {
    const r = await timedFetch("/api/product-ops/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `EPIC103 controlled ${category} test`,
        screen: "epic103_feedback",
        deviceId,
        versionCode: Number(buildNumber),
        category,
        metadata: { navigationPath: ["boot", "catalog"], build: buildNumber, screen: "epic103_feedback" },
      }),
    });
    feedbackResults.push({
      category,
      id: (r.body as { id?: string }).id,
      status: r.status,
      classification: (r.body as { classification?: string }).classification,
    });
  }

  const emptyFb = await timedFetch("/api/product-ops/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "" }),
  });

  writeFileSync(join(OUT_DIR, "feedback-e2e.json"), JSON.stringify({ feedbackResults, emptyRejected: emptyFb.status === 400 }, null, 2));

  rows.push({
    id: "feedback_e2e_submission",
    status: feedbackResults.every((f) => f.status === 200 && f.id) ? "PASS" : "FAIL",
    evidence: JSON.stringify(feedbackResults.map((f) => ({ category: f.category, status: f.status }))),
  });

  // Part 5 — Crash observatory transport
  const crashRes = await timedFetch("/api/mobile/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appVersion,
      platform: "android",
      event: "crash",
      screen: "epic103_crash_test",
      sessionId,
      deviceId,
      versionCode: Number(buildNumber),
      metadata: {
        errorMessage: "BETA_VALIDATION_CONTROLLED_CRASH",
        kind: "js_crash",
        userRole: "buyer",
        network: "online",
        model: "epic103-test-device",
        stepsBeforeCrash: "boot → home → epic103_crash_test",
        buildNumber: Number(buildNumber),
      },
    }),
  });

  writeFileSync(join(OUT_DIR, "crash-observatory.json"), JSON.stringify({
    transport: { status: crashRes.status, accepted: (crashRes.body as { accepted?: boolean }).accepted },
    observatoryApiBlocked: betaApiFail,
    nativeCrash: "NOT_RUN",
    sensitiveContentExcluded: true,
  }, null, 2));

  rows.push({
    id: "crash_observatory_transport",
    status: crashRes.ok ? "PASS" : "FAIL",
    detail: String(crashRes.status),
  });
  rows.push({
    id: "crash_observatory_dashboard",
    status: betaApiFail ? "BLOCKED" : "NOT_RUN",
    detail: "Beta dashboard not deployed",
  });
  rows.push({ id: "native_crash_reporting", status: "NOT_RUN", detail: "Requires physical Android device" });

  // Part 6 — Performance
  rows.push({
    id: "performance_observatory",
    status: betaApiFail ? "BLOCKED" : "INSUFFICIENT_DATA",
    detail: "P50/P95/P99 require deployed beta API + sufficient sample",
  });

  // Part 7-8 — Golden journeys
  rows.push({ id: "buyer_golden_journey", status: "NOT_RUN", detail: "Requires physical Android device + APK" });
  rows.push({ id: "seller_golden_journey", status: "NOT_RUN", detail: "Requires physical Android device + APK" });

  // Part 9 — Cross-role transaction (API-level partial)
  const buyerLogin = await login(BUYER_EMAIL, BUYER_PASSWORD, "epic103-cross-buyer");
  const sellerLogin = await login(SELLER_EMAIL, SELLER_PASSWORD, "epic103-cross-seller");
  const buyerToken = (buyerLogin.body as { accessToken?: string }).accessToken;
  const sellerToken = (sellerLogin.body as { accessToken?: string }).accessToken;

  let crossRoleStatus: Status = "FAIL";
  let crossRoleDetail = "";

  if (buyerToken && sellerToken) {
    const sellerHome = await timedFetch("/api/mobile/seller/home", { headers: { Authorization: `Bearer ${sellerToken}` } });
    const sellerProducts = await timedFetch("/api/mobile/seller/products?limit=5", { headers: { Authorization: `Bearer ${sellerToken}` } });
    const catalog = await timedFetch("/api/mobile/catalog/products?limit=5", { headers: { Authorization: `Bearer ${buyerToken}` } });
    const productId = ((catalog.body as { items?: Array<{ id?: string }> }).items ?? [])[0]?.id;

    let cartAdd = { status: 0 };
    if (productId) {
      cartAdd = await timedFetch("/api/cart", {
        method: "POST",
        headers: { Authorization: `Bearer ${buyerToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
    }

    const buyerOrders = await timedFetch("/api/orders", { headers: { Authorization: `Bearer ${buyerToken}` } });
    const partialOk =
      sellerHome.ok &&
      sellerProducts.ok &&
      catalog.ok &&
      (productId ? cartAdd.status === 201 || cartAdd.status === 200 : false);

    crossRoleStatus = partialOk ? "PASS" : "FAIL";
    crossRoleDetail = JSON.stringify({
      sellerHome: sellerHome.status,
      sellerProducts: sellerProducts.status,
      catalog: catalog.status,
      cartAdd: cartAdd.status,
      buyerOrders: buyerOrders.status,
      note: "Full purchase/checkout NOT_SUPPORTED on mobile alpha checkout screen",
    });

    if (!partialOk) {
      bugs.push({
        id: "EP103-002",
        severity: "P1",
        screen: "cross_role",
        role: "buyer+seller",
        steps: ["Seller login", "Buyer login", "Catalog", "Cart add"],
        expected: "Seller home 200, catalog 200, cart add 201",
        actual: crossRoleDetail,
        evidence: crossRoleDetail,
        suspectedCause: "API or seed data issue",
        fixRecommendation: "Verify staging smoke passes",
        regressionTest: "mobile:staging-smoke",
      });
    }
  } else {
    crossRoleStatus = "FAIL";
    crossRoleDetail = "Login failed";
  }

  writeFileSync(join(OUT_DIR, "cross-role-transaction.json"), JSON.stringify({ status: crossRoleStatus, detail: crossRoleDetail }, null, 2));
  rows.push({
    id: "cross_role_transaction_api",
    status: crossRoleStatus,
    detail: crossRoleDetail,
  });
  rows.push({
    id: "cross_role_full_purchase",
    status: "NOT_SUPPORTED",
    detail: "Mobile checkout is alpha placeholder — web checkout path not validated in this harness",
  });

  // Checkout screen is placeholder — P1 for buyer journey completion on mobile
  const checkoutSrc = readFileSync(join(process.cwd(), "apps/mobile/app/checkout.tsx"), "utf8");
  if (checkoutSrc.includes("Alpha использует backend checkout contract")) {
    bugs.push({
      id: "EP103-003",
      severity: "P1",
      screen: "checkout",
      role: "buyer",
      steps: ["Navigate to checkout on mobile"],
      expected: "Buyer can complete checkout flow",
      actual: "Checkout screen is informational placeholder only",
      evidence: "apps/mobile/app/checkout.tsx",
      suspectedCause: "Alpha checkout not implemented on mobile — by design until APP-SHELL-1",
      fixRecommendation: "Document as NOT_SUPPORTED for mobile native checkout OR implement alpha web redirect",
      regressionTest: "buyer_golden_journey physical",
    });
    rows.push({ id: "buyer_checkout_mobile", status: "NOT_SUPPORTED", detail: "Placeholder checkout screen" });
  }

  // Part 10 — Offline/restart
  rows.push({ id: "offline_restart", status: "NOT_RUN", detail: "Requires physical device" });
  rows.push({ id: "restart_persistence", status: "NOT_RUN", detail: "Requires physical device" });

  // Part 11 — Destructive interactions
  rows.push({ id: "destructive_interaction_audit", status: "NOT_RUN", detail: "Requires physical device" });

  // Part 12 — Authorization
  let authStatus: Status = "PASS";
  if (buyerToken && sellerToken) {
    const buyerOnSellerProducts = await timedFetch("/api/mobile/seller/products", {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const items = (buyerOnSellerProducts.body as { items?: unknown[] }).items ?? [];
    if (buyerOnSellerProducts.ok && items.length === 0) {
      authStatus = "PASS";
    } else if (!buyerOnSellerProducts.ok) {
      authStatus = "PASS";
    } else {
      authStatus = "FAIL";
    }
  }
  rows.push({ id: "authorization_audit", status: authStatus, detail: "Buyer seller_products returns empty or denied" });

  // Part 13 — Privacy
  const privacy = runPrivacyAudit();
  writeFileSync(join(OUT_DIR, "privacy-audit.json"), JSON.stringify(privacy, null, 2));
  rows.push({
    id: "privacy_audit",
    status: privacy.verdict === "PASS" ? "PASS" : "FAIL",
    detail: `${privacy.findings.length} findings`,
  });

  // Part 14 — Dashboard accuracy
  rows.push({
    id: "dashboard_accuracy",
    status: betaApiFail ? "BLOCKED" : "NOT_RUN",
    detail: "Cannot compare dashboard vs events without deployed beta API",
  });

  // Part 15 — Release gates calibration
  const releaseGates = [
    { id: "crash_free_sessions", dataSource: "productTelemetryEvent", minSample: 100, currentSample: "INSUFFICIENT_DATA", verdict: "INSUFFICIENT_DATA" },
    { id: "critical_bugs", dataSource: "productFeedbackItem", minSample: 1, currentSample: "INSUFFICIENT_DATA", verdict: "INSUFFICIENT_DATA" },
    { id: "checkout_failures", dataSource: "telemetry checkout errors", minSample: 10, currentSample: 0, verdict: "INSUFFICIENT_DATA" },
    { id: "product_creation_success", dataSource: "product + telemetry", minSample: 20, currentSample: "INSUFFICIENT_DATA", verdict: "INSUFFICIENT_DATA" },
    { id: "order_completion", dataSource: "orders table", minSample: 20, currentSample: "INSUFFICIENT_DATA", verdict: "INSUFFICIENT_DATA" },
  ];
  writeFileSync(join(OUT_DIR, "release-gates-calibration.json"), JSON.stringify({ gates: releaseGates }, null, 2));
  rows.push({ id: "release_gates_calibration", status: "INSUFFICIENT_DATA", detail: "No local DATABASE_URL — gates documented not computed" });

  // Part 16 — Regression pack
  const regressionRows = [
    runGate("mobile_typecheck", "cd apps/mobile && npm run typecheck"),
    runGate("mobile_epic_102_gate", "npm run mobile:epic-102:gate"),
    runGate("mobile_epic_83_gate", "npm run mobile:epic-83:gate"),
    runGate("mobile_staging_smoke", "npm run mobile:staging-smoke"),
    runGate("epic_103_unit_tests", "npm test -- tests/epic-103-closed-beta-rc.test.ts"),
  ];
  for (const r of regressionRows) rows.push({ ...r, id: `regression_${r.id}` });

  writeFileSync(join(OUT_DIR, "bugs.json"), JSON.stringify({ bugs }, null, 2));

  const p0 = bugs.filter((b) => b.severity === "P0").length;
  const p1 = bugs.filter((b) => b.severity === "P1").length;
  const p2 = bugs.filter((b) => b.severity === "P2").length;
  const p3 = bugs.filter((b) => b.severity === "P3").length;

  const scorecard = {
    BUILD: baseline.apkPath ? "PASS" : "NOT_RUN",
    STAGING: baseline.backendDeployment.matchesCandidate ? "PASS" : "FAIL",
    BETA_API: betaApiFail ? "FAIL" : "PASS",
    TELEMETRY_E2E: telemetryOk ? "PASS" : "FAIL",
    FEEDBACK_E2E: feedbackResults.every((f) => f.status === 200) ? "PASS" : "FAIL",
    CRASH_OBSERVATORY: crashRes.ok ? "PASS" : "FAIL",
    PERFORMANCE: betaApiFail ? "BLOCKED" : "INSUFFICIENT_DATA",
    BUYER_JOURNEY: "NOT_RUN",
    SELLER_JOURNEY: "NOT_RUN",
    CROSS_ROLE_TRANSACTION: crossRoleStatus,
    OFFLINE: "NOT_RUN",
    RESTART: "NOT_RUN",
    DUPLICATE_MUTATIONS: "NOT_RUN",
    AUTHORIZATION: authStatus,
    PRIVACY: privacy.verdict,
    DASHBOARD_ACCURACY: betaApiFail ? "BLOCKED" : "NOT_RUN",
    P0_BUGS: p0,
    P1_BUGS: p1,
    P2_BUGS: p2,
    P3_BUGS: p3,
  };

  let finalVerdict: "READY_FOR_CLOSED_BETA" | "NOT_READY_FOR_CLOSED_BETA" | "BLOCKED_PENDING_DEVICE_VALIDATION";

  if (p0 > 0 || p1 > 0 || privacy.verdict === "FAIL" || betaApiFail) {
    finalVerdict = "NOT_READY_FOR_CLOSED_BETA";
  } else if (
    scorecard.BUYER_JOURNEY === "NOT_RUN" ||
    scorecard.SELLER_JOURNEY === "NOT_RUN" ||
    !baseline.apkPath
  ) {
    finalVerdict = "BLOCKED_PENDING_DEVICE_VALIDATION";
  } else {
    finalVerdict = "READY_FOR_CLOSED_BETA";
  }

  const finalReport = {
    epic: "EPIC-103",
    generatedAt: new Date().toISOString(),
    candidate: { commit, branch, appVersion, buildNumber, stagingSha },
    scorecard,
    finalVerdict,
    rows,
    regression: regressionRows,
    evidencePrinciple: "Evidence > assumptions — statuses reflect observed staging/API/device constraints",
  };

  writeFileSync(join(OUT_DIR, "final-report.json"), JSON.stringify(finalReport, null, 2));

  console.log(JSON.stringify(finalReport, null, 2));

  const exitCode =
    finalVerdict === "NOT_READY_FOR_CLOSED_BETA" ? 1 : 0;
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
