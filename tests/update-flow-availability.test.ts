import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { isUpdateEligibleForInstall } from "../apps/mobile/src/utils/update-eligibility";
import type { MobileUpdateInfo } from "../apps/mobile/src/api/endpoints";

const updateCheck = readFileSync("apps/mobile/src/update/use-update-check.ts", "utf8");
const updateAvailability = readFileSync("apps/mobile/src/update/update-availability.ts", "utf8");
const updateHost = readFileSync("apps/mobile/src/components/UpdateHost.tsx", "utf8");
const appStore = readFileSync("apps/mobile/src/store/app-store.ts", "utf8");
const bootScreen = readFileSync("apps/mobile/app/index.tsx", "utf8");
const profileBadgeHook = readFileSync("apps/mobile/src/update/use-update-availability-badge.ts", "utf8");

function update(overrides: Partial<MobileUpdateInfo>): MobileUpdateInfo {
  return {
    latestVersion: "0.1.14-beta.2",
    versionCode: 15,
    versionName: "0.1.14-beta.2",
    updateRequired: false,
    updateState: "OPTIONAL_UPDATE",
    mandatory: false,
    downloadUrl: "https://example.com/rc9.1.apk",
    sha256: "abc",
    releaseNotes: [],
    channel: "CLOSED_BETA",
    rollout: { percent: 100, eligible: true },
    compatibility: { compatible: true, forceUpgrade: false },
    ...overrides,
  };
}

describe("EPIC 158.3 — update flow availability", () => {
  it("refreshes update on foreground instead of boot-only stale state", () => {
    expect(updateCheck).toContain("AppState.addEventListener");
    expect(updateCheck).toContain("fetchInstallableUpdate");
    expect(updateHost).not.toContain("pendingUpdate");
  });

  it("stores update availability for profile badge", () => {
    expect(appStore).toContain("updateAvailable");
    expect(appStore).toContain("setUpdateAvailable");
    expect(bootScreen).toContain("setUpdateAvailable");
    expect(profileBadgeHook).toContain("useFocusEffect");
  });

  it("keeps CLOSED_BETA eligibility contract for older clients", () => {
    expect(isUpdateEligibleForInstall(update({ versionCode: 15 }), 14)).toBe(true);
    expect(isUpdateEligibleForInstall(update({ versionCode: 15, updateState: "NO_UPDATE" }), 15)).toBe(false);
    expect(updateAvailability).toContain("installedVersionCode");
  });
});
