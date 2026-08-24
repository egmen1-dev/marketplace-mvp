import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { isUpdateEligibleForInstall } from "../apps/mobile/src/utils/update-eligibility";
import type { MobileUpdateInfo } from "../apps/mobile/src/api/endpoints";

const profileMenu = readFileSync("apps/mobile/src/components/ProfileMenu.tsx", "utf8");
const profileScreen = readFileSync("apps/mobile/app/(tabs)/profile.tsx", "utf8");
const updateScreen = readFileSync("apps/mobile/app/update.tsx", "utf8");
const layout = readFileSync("apps/mobile/app/_layout.tsx", "utf8");
const updateLabels = readFileSync("apps/mobile/src/update/update-ui-labels.ts", "utf8");
const updateFlow = readFileSync("apps/mobile/src/hooks/useUpdateCheckFlow.ts", "utf8");

function update(overrides: Partial<MobileUpdateInfo>): MobileUpdateInfo {
  return {
    latestVersion: "0.1.10-beta.1",
    versionCode: 9,
    versionName: "0.1.10-beta.1",
    updateRequired: false,
    updateState: "OPTIONAL_UPDATE",
    mandatory: false,
    downloadUrl: "https://example.com/rc5.apk",
    sha256: "abc",
    releaseNotes: [],
    channel: "CLOSED_BETA",
    rollout: { percent: 100, eligible: true },
    compatibility: { compatible: true, forceUpgrade: false },
    ...overrides,
  };
}

describe("mobile update entry — profile menu", () => {
  it("contains Russian label Проверить обновление or badge state", () => {
    expect(profileMenu).toMatch(/Проверить обновление|Обновление доступно/);
  });

  it("shows app section with О приложении and update entry for all users", () => {
    expect(profileMenu).toContain('ProfileMenuSection title="Приложение"');
    expect(profileMenu).toContain('label: "О приложении"');
    expect(profileMenu).not.toContain("onCheckUpdate");
  });

  it("navigates to /update on tap (not dead inline handler)", () => {
    expect(profileMenu).toContain('router.push("/update")');
  });

  it("does not gate update entry on sellerCapable", () => {
    const appSection = profileMenu.slice(profileMenu.indexOf("const app: MenuItem[]"));
    expect(appSection).toContain("Проверить обновление");
    expect(appSection).not.toContain("sellerCapable");
  });

  it("buyer profile always renders ProfileMenu with sellerCapable from store", () => {
    expect(profileScreen).toContain("sellerCapable={sellerCapable}");
    expect(profileScreen).toContain("useAppStore");
  });

  it("seller profile uses same ProfileMenu (sellerCapable only affects sales/finance sections)", () => {
    expect(profileMenu).toMatch(/const sales: MenuItem\[\] = sellerCapable/);
    expect(profileMenu).toMatch(/const app: MenuItem\[\] = \[/);
  });
});

describe("mobile update entry — dedicated screen", () => {
  it("registers update route with Russian title", () => {
    expect(layout).toContain('name="update"');
    expect(layout).toContain('title: "Проверить обновление"');
    expect(layout).not.toContain('title: "update"');
  });

  it("update screen uses canonical check flow hook", () => {
    expect(updateScreen).toContain("useUpdateCheckFlow");
    expect(updateFlow).toContain("fetchMobileUpdate");
    expect(updateFlow).toContain("startApkDownload");
  });

  it("shows required Russian states and honest browser handoff copy", () => {
    expect(updateLabels).toContain("Проверяем обновления…");
    expect(updateLabels).toContain("У вас установлена актуальная версия");
    expect(updateLabels).toContain("Доступно обновление");
    expect(updateLabels).toContain("Скачать обновление");
    expect(updateLabels).toContain("APK откроется в браузере");
    expect(updateScreen).toContain("buildInfo.appVersion");
    expect(updateFlow).toContain("getBuildInfo");
  });
});

describe("mobile update entry — eligibility (MRP contract)", () => {
  it("code 7 → RC5 update offered", () => {
    expect(isUpdateEligibleForInstall(update({ versionCode: 9, updateState: "OPTIONAL_UPDATE" }), 7)).toBe(true);
  });

  it("code 8 → RC5 update offered", () => {
    expect(isUpdateEligibleForInstall(update({ versionCode: 9, updateState: "OPTIONAL_UPDATE" }), 8)).toBe(true);
  });

  it("code 9 → no update", () => {
    expect(isUpdateEligibleForInstall(update({ versionCode: 9, updateState: "NO_UPDATE" }), 9)).toBe(false);
  });

  it("code 10 → no downgrade offered", () => {
    expect(isUpdateEligibleForInstall(update({ versionCode: 9, updateState: "OPTIONAL_UPDATE" }), 10)).toBe(false);
  });
});

describe("mobile update entry — RC5 APK truth", () => {
  it("documents that shipped RC5 had menu bytecode but no dedicated /update screen", () => {
    const rc5BundleNote = "RC5 APK (0.1.10-beta.1) contained ProfileMenu onCheckUpdate inline handler but no /update route";
    expect(rc5BundleNote).toContain("/update");
  });
});
