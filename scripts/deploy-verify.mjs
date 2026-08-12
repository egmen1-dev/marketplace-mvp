/**
 * DEVOPS-001 — verify staging/production deploy matches expected commit.
 *
 * Usage:
 *   EXPECTED_COMMIT=58e681f node scripts/deploy-verify.mjs
 *   node scripts/deploy-verify.mjs 58e681f
 */
const BASE =
  process.env.BASE_URL ?? "https://web-production-e56fb.up.railway.app";

const expectedRaw =
  process.argv[2]?.trim() ||
  process.env.EXPECTED_COMMIT?.trim() ||
  process.env.GIT_COMMIT?.trim();

if (!expectedRaw) {
  console.error(
    "EXPECTED_COMMIT is required (env or first arg). Example: EXPECTED_COMMIT=58e681f node scripts/deploy-verify.mjs",
  );
  process.exit(1);
}

const expectedCommit = expectedRaw.slice(0, 7).toLowerCase();

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function fetchJson(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
}

function commitsMatch(actual, expected) {
  if (!actual || actual === "unknown") return false;
  return actual.slice(0, 7).toLowerCase() === expected;
}

async function main() {
  console.log(`Base URL: ${BASE}`);
  console.log(`Expected commit: ${expectedCommit}`);

  const versionResult = await fetchJson("/api/version");
  record(
    "GET /api/version → 200",
    versionResult.res.status === 200,
    `status=${versionResult.res.status}`,
  );

  const version = versionResult.body;
  if (version) {
    record(
      "Version environment present",
      typeof version.environment === "string",
      version.environment ?? "missing",
    );
    record(
      "Version commit matches expected",
      commitsMatch(version.commit, expectedCommit),
      `got=${version.commit ?? "missing"}`,
    );
    record(
      "Version buildTime present",
      Boolean(version.buildTime && version.buildTime !== "unknown"),
      version.buildTime ?? "missing",
    );
  }

  const healthResult = await fetchJson("/api/health");
  record(
    "GET /api/health → 200",
    healthResult.res.status === 200 && healthResult.body?.ok === true,
    `status=${healthResult.res.status}`,
  );
  if (healthResult.body?.version) {
    record(
      "Health version.commit matches expected",
      commitsMatch(healthResult.body.version.commit, expectedCommit),
      `got=${healthResult.body.version.commit ?? "missing"}`,
    );
    record(
      "Health database check OK",
      healthResult.body.checks?.database?.ok === true,
    );
  }

  for (const path of ["/", "/catalog", "/api/version"]) {
    const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
    record(`GET ${path} → 200`, res.status === 200, `status=${res.status}`);
  }

  const catalogRes = await fetch(`${BASE}/catalog`, { redirect: "follow" });
  const catalogHtml = catalogRes.ok ? await catalogRes.text() : "";
  const productMatch = catalogHtml.match(/href="(\/product\/[^"]+)"/);
  if (productMatch?.[1]) {
    const productPath = productMatch[1];
    const productRes = await fetch(`${BASE}${productPath}`, { redirect: "follow" });
    record(`GET ${productPath} → 200`, productRes.status === 200, `status=${productRes.status}`);
  } else {
    record("GET /product/* → 200", false, "no product link in catalog");
  }

  const analyticsResult = await fetchJson("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "page_view",
      route: "/",
      visitorId: "deploy-verify",
    }),
  });
  record(
    "POST /api/analytics/events → 200",
    analyticsResult.res.status === 200 && analyticsResult.body?.ok === true,
    `status=${analyticsResult.res.status}`,
  );

  const failed = results.filter((r) => !r.ok);
  console.log("\n--- SUMMARY ---");
  console.log(`Passed: ${results.length - failed.length}/${results.length}`);
  if (failed.length > 0) {
    console.error("Deploy verification failed.");
    process.exit(1);
  }
  console.log("Deploy verification passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
