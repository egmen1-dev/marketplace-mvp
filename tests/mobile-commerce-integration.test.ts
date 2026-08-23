import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { isUpdateEligibleForInstall } from "../apps/mobile/src/utils/update-eligibility";
import type { MobileUpdateInfo } from "../apps/mobile/src/api/endpoints";

const endpointsSource = readFileSync("apps/mobile/src/api/endpoints.ts", "utf8");
const catalogSource = readFileSync("apps/mobile/app/(tabs)/catalog.tsx", "utf8");
const indexSource = readFileSync("apps/mobile/app/(tabs)/index.tsx", "utf8");
const commerceActionsSource = readFileSync("apps/mobile/src/hooks/useCommerceActions.ts", "utf8");
const commerceTelemetrySource = readFileSync("apps/mobile/src/commerce/commerce-telemetry.ts", "utf8");
const downloadApkSource = readFileSync("apps/mobile/src/update/download-apk.ts", "utf8");
const layoutSource = readFileSync("apps/mobile/app/_layout.tsx", "utf8");
const aboutSource = readFileSync("apps/mobile/app/about.tsx", "utf8");

function update(overrides: Partial<MobileUpdateInfo>): MobileUpdateInfo {
  return {
    latestVersion: "0.1.10-beta.1",
    versionCode: 9,
    versionName: "0.1.10-beta.1",
    updateRequired: false,
    updateState: "OPTIONAL_UPDATE",
    mandatory: false,
    downloadUrl: "https://example.com/app.apk",
    sha256: null,
    releaseNotes: [],
    channel: "CLOSED_BETA",
    rollout: { percent: 100, eligible: true },
    compatibility: { compatible: true, forceUpgrade: false },
    ...overrides,
  };
}

describe("mobile commerce integration — wiring contracts", () => {
  it("fetchCatalog sends categoryId not display name", () => {
    expect(endpointsSource).toContain('search.set("categoryId", params.categoryId)');
    expect(endpointsSource).not.toMatch(/search\.set\("category",/);
  });

  it("home category nav passes categoryId and clears search param", () => {
    expect(indexSource).toContain("categoryId: cat.id");
    expect(indexSource).toContain('q: ""');
    expect(indexSource).not.toMatch(/categoryId: cat\.id,\s*q: cat\.name/);
  });

  it("catalog category select clears search query to avoid double filter", () => {
    expect(catalogSource).toContain('if (cat) setQ("")');
  });

  it("useCommerceActions wires telemetry and auth redirect", () => {
    expect(commerceActionsSource).toContain("trackCommerceAction");
    expect(commerceActionsSource).toContain("handleCommerceAuthFailure");
    expect(commerceActionsSource).toContain("refreshTabBadges");
  });

  it("commerce telemetry emits MOBILE_COMMERCE_ACTION with build metadata fields", () => {
    expect(commerceTelemetrySource).toContain('"MOBILE_COMMERCE_ACTION"');
    expect(commerceTelemetrySource).toContain("appVersion");
    expect(commerceTelemetrySource).toContain("versionCode");
    expect(commerceTelemetrySource).toContain("commitSha");
    expect(commerceTelemetrySource).not.toMatch(/accessToken|refreshToken|password/i);
  });

  it("session warms on app mount", () => {
    expect(layoutSource).toContain("warmSessionFromStorage");
  });

  it("about screen exposes build identity", () => {
    expect(aboutSource).toContain("getBuildInfo");
    expect(aboutSource).toContain("EXPO_PUBLIC_RC_LABEL");
  });
});

describe("mobile commerce integration — update honesty", () => {
  it("does not fire downloaded telemetry before browser handoff", () => {
    expect(downloadApkSource).not.toMatch(/UPDATE_ANALYTICS\.downloaded/);
    expect(downloadApkSource).toContain("Linking.openURL");
  });

  it("offers RC5 when installed code is lower", () => {
    expect(isUpdateEligibleForInstall(update({ versionCode: 9 }), 8)).toBe(true);
    expect(isUpdateEligibleForInstall(update({ versionCode: 7 }), 8)).toBe(false);
  });
});
