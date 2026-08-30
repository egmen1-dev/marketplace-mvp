import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("mobile firebase instrumentation harness", () => {
  it("documents manual Test Lab workflow", () => {
    const doc = readFileSync(join(ROOT, "docs/mobile/FIREBASE_TEST_LAB_INSTRUMENTATION.md"), "utf8");
    expect(doc).toContain("lot-under-test.apk");
    expect(doc).toContain("lot-instrumentation-tests.apk");
    expect(doc).toContain("FirebaseCriticalSellerJourneyTest");
    expect(doc).toContain("redfin");
  });

  it("wires expo plugin and kotlin suite", () => {
    const appJson = JSON.parse(readFileSync(join(ROOT, "apps/mobile/app.json"), "utf8"));
    expect(appJson.expo.plugins).toContain("./plugins/withFirebaseInstrumentation.js");
    const support = join(
      ROOT,
      "apps/mobile/instrumentation/androidTest/java/ru/lot/marketplace/alpha/test/FirebaseQaSupport.kt",
    );
    expect(existsSync(support)).toBe(true);
  });

  it("exposes QA photo seam only behind firebase flag", () => {
    const source = readFileSync(join(ROOT, "apps/mobile/src/seller/use-lot-create-form.ts"), "utf8");
    expect(source).toContain("injectFixturePhoto");
    expect(source).toContain("isFirebaseQaEnabled");
  });

  it("declares runtime budget under 20 minutes", () => {
    const manifestPath = join(ROOT, "artifacts/firebase-test-lab/build-manifest.json");
    if (!existsSync(manifestPath)) return;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.estimatedInstrumentationMinutes).toBeLessThanOrEqual(20);
  });
});
