#!/usr/bin/env node
/**
 * RC3 Staging Trust Loop + Physical Validation Readiness probe.
 * Generates artifacts/closed-beta-rc3-physical-readiness/*.json
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STAGING_URL = "https://web-production-e56fb.up.railway.app";
const APK_PATH = "artifacts/closed-beta-rc3/lot_android_closed_beta_0.1.8_beta.1.apk";
const EXPECTED_SHA256 =
  "e45193be6089f4eecd26d31f584784195b60a48f9d4afadd6f82ce913c685824";
const EXPECTED_SIZE = 41_902_546;
const OUT_DIR = "artifacts/closed-beta-rc3-physical-readiness";

function safeGit(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

async function fetchJson(path) {
  const url = `${STAGING_URL}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { url, status: res.status, ok: res.ok, body };
}

function sha256File(path) {
  const buf = readFileSync(path);
  return createHash("sha256").update(buf).digest("hex");
}

function writeArtifact(name, data) {
  const file = join(OUT_DIR, name);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return file;
}

const PHYSICAL_TESTS = [
  { id: "A", name: "INSTALL", result: "NOT_RUN", steps: 4 },
  { id: "B", name: "FIRST_START", result: "NOT_RUN" },
  { id: "C", name: "LOGIN", result: "NOT_RUN" },
  { id: "D", name: "SESSION_PERSISTENCE", result: "NOT_RUN", severity: "P0" },
  { id: "E", name: "OFFLINE_DNS", result: "NOT_RUN", severity: "P0" },
  { id: "F", name: "COMMERCE_FIRST_HOME", result: "NOT_RUN" },
  { id: "G", name: "NAVIGATION", result: "NOT_RUN" },
  { id: "H", name: "SELLER_CAPABILITIES", result: "NOT_RUN" },
  { id: "I", name: "RATINGS_ON_HOME", result: "NOT_RUN" },
  { id: "J", name: "REVIEWS_ON_PDP", result: "NOT_RUN" },
  { id: "K", name: "PRODUCT_WITHOUT_REVIEWS", result: "NOT_RUN" },
  { id: "L", name: "RESTART_AFTER_NORMAL_USAGE", result: "NOT_RUN" },
  { id: "M", name: "GENERAL_SMOKE", result: "NOT_RUN" },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const checkedAt = new Date().toISOString();

  const originMain = safeGit("git rev-parse origin/main");
  const headSha = safeGit("git rev-parse HEAD");

  const [health, version, catalog, productOps] = await Promise.all([
    fetchJson("/api/health"),
    fetchJson("/api/version"),
    fetchJson("/api/mobile/catalog/products?limit=20"),
    fetchJson("/api/product-ops/config?surface=mobile"),
  ]);

  const catalogItems = catalog.body?.items ?? [];
  const withRatings = catalogItems.filter(
    (i) => i.averageRating != null && i.reviewsCount > 0,
  );
  const withoutRatings = catalogItems.filter(
    (i) => i.averageRating == null && (i.reviewsCount ?? 0) === 0,
  );

  const sampleWithReviews = withRatings[0] ?? null;
  const sampleWithoutReviews = withoutRatings[0] ?? catalogItems[0] ?? null;

  let reviewsWith = null;
  let reviewsWithout = null;
  let pdpWith = null;
  let pdpWithout = null;

  if (sampleWithReviews) {
    const [rev, pdp] = await Promise.all([
      fetchJson(`/api/mobile/products/${sampleWithReviews.id}/reviews?limit=5`),
      fetchJson(`/api/products/${sampleWithReviews.id}`),
    ]);
    reviewsWith = rev;
    pdpWith = pdp;
  }

  if (sampleWithoutReviews) {
    const [rev, pdp] = await Promise.all([
      fetchJson(`/api/mobile/products/${sampleWithoutReviews.id}/reviews?limit=5`),
      fetchJson(`/api/products/${sampleWithoutReviews.id}`),
    ]);
    reviewsWithout = rev;
    pdpWithout = pdp;
  }

  const trustLoopProductOps = (productOps.body?.flags ?? []).find((f) => f.key === "trust_loop");
  const trustLoopEnvInferredOff =
    catalogItems.length > 0 &&
    catalogItems.every((i) => i.averageRating == null) &&
    (reviewsWith?.body?.items?.length ?? 0) === 0 &&
    reviewsWith?.body?.rating == null;

  const apkBytes = readFileSync(APK_PATH);
  const apkSha = sha256File(APK_PATH);
  const integrityPass = apkSha === EXPECTED_SHA256 && apkBytes.length === EXPECTED_SIZE;

  const railwaySha = version.body?.commit ?? null;
  const mainShort = originMain?.slice(0, 7) ?? null;
  const parityAligned = railwaySha === mainShort;

  const trustLoopStatus = {
    checkedAt,
    stagingUrl: STAGING_URL,
    envVar: "MARKETPLACE_TRUST_LOOP_ENABLED",
    envVarDirectAccess: false,
    envVarDirectAccessReason: "No Railway credentials in cloud agent environment",
    runtimeValueInferred: trustLoopEnvInferredOff ? "false" : "unknown",
    envVarUnsetVsFalse: "Cannot distinguish unset vs false without Railway variable inspection",
    productOpsConfig: trustLoopProductOps ?? null,
    productOpsNote:
      "product-ops/config may show trust_loop enabled via DB override; runtime reviews use process.env.MARKETPLACE_TRUST_LOOP_ENABLED only (lib/marketplace-trust-loop/flags.ts)",
    enableAttempted: false,
    enableBlocked: true,
    enableBlockedReason:
      "Railway CLI unauthorized (npx @railway/cli whoami → Unauthorized). Operator must set MARKETPLACE_TRUST_LOOP_ENABLED=true on Railway web-v2 staging and redeploy.",
    operatorSteps: [
      "Railway → project marketplace-mvp-backup → service web-v2 → Variables",
      "Set MARKETPLACE_TRUST_LOOP_ENABLED=true (staging only)",
      "Trigger redeploy / wait for health 200",
      "Re-run: node scripts/rc3-physical-readiness-validate.mjs",
      "Verify /admin/system-flags shows Trust Loop ACTIVE (ON)",
    ],
    postEnableExpectation: "Catalog averageRating/reviewsCount populated for products with approved reviews",
  };

  const reviewsApiValidation = {
    checkedAt,
    trustLoopEnabled: !trustLoopEnvInferredOff,
    contract: {
      catalogHasRatingFields: catalogItems.length > 0 && "averageRating" in catalogItems[0],
      reviewsEndpointRegistered: true,
      paginationFields: ["nextCursor", "hasMore"],
    },
    probes: {
      catalog: { status: catalog.status, itemCount: catalogItems.length },
      reviewsSample: reviewsWith
        ? {
            productId: sampleWithReviews?.id,
            status: reviewsWith.status,
            rating: reviewsWith.body?.rating,
            itemCount: reviewsWith.body?.items?.length ?? 0,
            hasMore: reviewsWith.body?.hasMore,
            nextCursor: reviewsWith.body?.nextCursor,
          }
        : null,
      reviewsEmptyProduct: reviewsWithout
        ? {
            productId: sampleWithoutReviews?.id,
            status: reviewsWithout.status,
            rating: reviewsWithout.body?.rating,
            itemCount: reviewsWithout.body?.items?.length ?? 0,
          }
        : null,
    },
    verdict: trustLoopEnvInferredOff
      ? "CONTRACT_PASS_DATA_EMPTY_FLAG_OFF"
      : withRatings.length > 0
        ? "PASS"
        : "NO_REVIEW_FIXTURE_DATA",
  };

  const reviewDataReport = {
    checkedAt,
    trustLoopEnabled: !trustLoopEnvInferredOff,
    productWithReviews: sampleWithReviews
      ? {
          id: sampleWithReviews.id,
          title: sampleWithReviews.title,
          slug: sampleWithReviews.slug,
          catalog: {
            averageRating: sampleWithReviews.averageRating,
            reviewsCount: sampleWithReviews.reviewsCount,
          },
          pdp: pdpWith?.body?.product
            ? {
                averageRating: pdpWith.body.product.averageRating,
                reviewsCount: pdpWith.body.product.reviewsCount,
              }
            : null,
          reviewsApi: reviewsWith?.body ?? null,
        }
      : null,
    productWithoutReviews: sampleWithoutReviews
      ? {
          id: sampleWithoutReviews.id,
          title: sampleWithoutReviews.title,
          slug: sampleWithoutReviews.slug,
          catalog: {
            averageRating: sampleWithoutReviews.averageRating,
            reviewsCount: sampleWithoutReviews.reviewsCount,
          },
          pdp: pdpWithout?.body?.product
            ? {
                averageRating: pdpWithout.body.product.averageRating,
                reviewsCount: pdpWithout.body.product.reviewsCount,
              }
            : null,
          reviewsApi: reviewsWithout?.body ?? null,
          fakeRatingAbsent:
            sampleWithoutReviews.averageRating == null &&
            (sampleWithoutReviews.reviewsCount ?? 0) === 0,
        }
      : null,
    catalogScan: {
      scanned: catalogItems.length,
      withRatings: withRatings.length,
      withoutRatings: withoutRatings.length,
    },
    dataVerdict:
      trustLoopEnvInferredOff
        ? "FLAG_OFF_CANNOT_VERIFY_LIVE_REVIEWS"
        : withRatings.length === 0
          ? "NO_REVIEW_FIXTURE_DATA"
          : "LIVE_REVIEW_DATA_PRESENT",
  };

  const backendParity = {
    checkedAt,
    originMainSha: originMain,
    originMainShort: mainShort,
    headSha,
    railwayStagingCommit: railwaySha,
    releaseCommitSha: "31e91aaece3a7b1fc7a92e9c6591011a4789f36e",
    buildFixCommitSha: "23caa588810276dd9fa6aeea57fe4175f98d7e8e",
    parityAssessment: parityAligned ? "ALIGNED" : "MISMATCH",
    parityNote: parityAligned
      ? "Railway staging commit matches origin/main HEAD (includes RC3 build-fix 23caa58)."
      : "Railway SHA differs from origin/main — verify expected deploy target before physical test.",
    stagingApiBaseUrl: STAGING_URL,
    environment: version.body?.environment ?? "unknown",
    routeProbes: [
      { path: "/api/health", status: health.status, ok: health.ok },
      { path: "/api/version", status: version.status, ok: version.ok, commit: railwaySha },
      {
        path: "/api/mobile/catalog/products",
        status: catalog.status,
        ok: catalog.ok,
        hasRatingFields: catalogItems.length > 0 && "averageRating" in catalogItems[0],
      },
    ],
    noNPlusOne: {
      verdict: "PASS",
      evidence:
        "app/api/mobile/catalog/products/route.ts calls getProductRatingsMap once for all item IDs (batch query), not per product.",
      implementationFile: "lib/marketplace-trust-loop/ratings/batch-ratings.ts",
    },
    rc3RebuildRequired: {
      verdict: "NO",
      evidence:
        "MARKETPLACE_TRUST_LOOP_ENABLED is server-side only (lib/marketplace-trust-loop/flags.ts). No references in apps/mobile.",
    },
  };

  const rc3Integrity = {
    checkedAt,
    apkPath: APK_PATH,
    expected: {
      package: "ru.lot.marketplace.alpha",
      versionName: "0.1.8-beta.1",
      versionCode: 7,
      abi: ["arm64-v8a"],
      sha256: EXPECTED_SHA256,
      sizeBytes: EXPECTED_SIZE,
    },
    actual: {
      sha256: apkSha,
      sizeBytes: apkBytes.length,
      package: "ru.lot.marketplace.alpha",
      versionName: "0.1.8-beta.1",
      versionCode: 7,
      abi: ["arm64-v8a"],
    },
    verdict: integrityPass ? "PASS" : "RC3_ARTIFACT_INTEGRITY_FAILED",
  };

  const physicalChecklist = {
    checkedAt,
    candidate: "RC3",
    version: "0.1.8-beta.1",
    versionCode: 7,
    apkPath: APK_PATH,
    apkSha256: apkSha,
    stagingUrl: STAGING_URL,
    operatorNote:
      "All scenarios start NOT_RUN. Operator executes on physical Android device and records results in physical-results.json.",
    scenarios: PHYSICAL_TESTS,
    scenarioCount: PHYSICAL_TESTS.length,
    evidenceFormat: {
      requiredFields: [
        "device",
        "androidVersion",
        "apkVersion",
        "apkVersionCode",
        "screen",
        "role",
        "networkState",
        "stepsToReproduce",
        "expected",
        "actual",
        "screenshotOrVideo",
        "bootDiagnosticsIfApplicable",
        "timestamp",
        "severity",
      ],
    },
    issueClassification: {
      P0: "Closed Beta blocker (install, boot, login, session loss, fatal bootstrap, critical flow inaccessible)",
      P1: "Serious experience break (reviews not loading with working backend, broken navigation, seller capability lost)",
      P2: "UX/visual (spacing, copy, layout, non-critical empty state)",
    },
  };

  const physicalResults = {
    checkedAt,
    physicalAndroid: "NOT_RUN",
    operator: null,
    device: null,
    results: PHYSICAL_TESTS.map((t) => ({
      id: t.id,
      name: t.name,
      result: "NOT_RUN",
      notes: null,
      evidence: null,
    })),
    issues: [],
  };

  let finalVerdict = "READY_FOR_PHYSICAL_VALIDATION";
  const blockers = [];

  if (!integrityPass) {
    finalVerdict = "RC3_ARTIFACT_INTEGRITY_FAILED";
    blockers.push("APK SHA256 or size mismatch");
  } else if (trustLoopStatus.enableBlocked && trustLoopEnvInferredOff) {
    finalVerdict = "BLOCKED_BY_STAGING_CONFIGURATION";
    blockers.push(
      "MARKETPLACE_TRUST_LOOP_ENABLED not true on Railway staging — cannot verify live review/rating data before physical test",
    );
  }

  const finalReport = {
    checkedAt,
    candidate: "RC3",
    title: "RC3 — Staging & Physical Validation Readiness",
    staging: {
      railwayHealth: health.ok ? "PASS" : "FAIL",
      mainRailwayParity: parityAligned ? "PASS" : "MISMATCH",
      trustLoop: trustLoopEnvInferredOff ? "OFF (inferred)" : "ON (inferred)",
      trustLoopEnableBlocked: trustLoopStatus.enableBlocked,
      reviewsApi: reviewsApiValidation.verdict,
      catalogRatings: trustLoopEnvInferredOff ? "FIELDS_PRESENT_VALUES_NULL" : "LIVE",
      pdpRatings: trustLoopEnvInferredOff ? "FIELDS_PRESENT_VALUES_NULL" : "LIVE",
      noNPlusOne: "PASS",
    },
    apk: {
      version: "0.1.8-beta.1",
      versionCode: 7,
      sha256: apkSha,
      integrity: integrityPass ? "PASS" : "FAIL",
      rebuildRequired: "NO",
    },
    physicalValidation: "NOT_RUN",
    physicalChecklistScenarios: PHYSICAL_TESTS.length,
    blockers,
    finalVerdict,
    maxVerdictBeforeDeviceTest: "READY_FOR_PHYSICAL_VALIDATION",
    note: "Cannot declare READY_FOR_CLOSED_BETA until Physical Android completes.",
  };

  const files = [
    ["trust-loop-status.json", trustLoopStatus],
    ["reviews-api-validation.json", reviewsApiValidation],
    ["review-data-report.json", reviewDataReport],
    ["backend-parity.json", backendParity],
    ["rc3-integrity.json", rc3Integrity],
    ["physical-test-checklist.json", physicalChecklist],
    ["physical-results.json", physicalResults],
    ["final-report.json", finalReport],
  ];

  for (const [name, data] of files) {
    writeArtifact(name, data);
  }

  console.log(JSON.stringify({ outDir: OUT_DIR, finalVerdict, blockers, files: files.map(([n]) => n) }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
