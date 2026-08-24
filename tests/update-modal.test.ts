import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const updateGate = readFileSync("apps/mobile/src/components/UpdateGate.tsx", "utf8");
const updateLabels = readFileSync("apps/mobile/src/update/update-ui-labels.ts", "utf8");
const profileMenu = readFileSync("apps/mobile/src/components/ProfileMenu.tsx", "utf8");
const profileScreen = readFileSync("apps/mobile/app/(tabs)/profile.tsx", "utf8");
const downloadApk = readFileSync("apps/mobile/src/update/download-apk.ts", "utf8");

describe("EPIC 158.3 — update modal UX", () => {
  it("shows seller-friendly update copy and actions", () => {
    expect(updateLabels).toContain('available: "Доступно обновление"');
    expect(updateLabels).toContain("Мы улучшили создание ЛОТов и исправили ошибки");
    expect(updateLabels).toContain('updateNow: "Обновить сейчас"');
    expect(updateLabels).toContain('later: "Позже"');
    expect(updateGate).toContain("UPDATE_UI_LABELS.updateNow");
    expect(updateGate).toContain("UPDATE_UI_LABELS.later");
    expect(updateGate).toContain("UPDATE_UI_LABELS.availableBody");
  });

  it("opens APK download URL on update CTA", () => {
    expect(updateGate).toContain("startApkDownload");
    expect(downloadApk).toContain("Linking.openURL");
  });

  it("shows profile badge when update is available", () => {
    expect(profileMenu).toContain("Обновление доступно");
    expect(profileMenu).toContain("updateAvailableVersion");
    expect(profileScreen).toContain("useUpdateAvailabilityBadge");
    expect(profileScreen).toContain("updateAvailableVersion=");
  });
});
