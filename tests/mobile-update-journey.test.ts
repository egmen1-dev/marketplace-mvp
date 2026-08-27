import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { evaluateUpdateDecision } from "@/lib/mobile/update-journey/mrp-contract";
import { createUpdateCheckSequenceGuard } from "@/lib/mobile/update-journey/request-sequencing";
import {
  buildUpdateScreenUiContract,
  failUpdateCheck,
  hasUpdateContradiction,
  legacyBuggyCheckFailure,
  legacyUpdateScreenWouldShowContradiction,
  completeUpdateCheck,
  beginUpdateCheck,
} from "@/lib/mobile/update-journey/update-state";
import { createUpdateJourneyHarness } from "@/lib/mobile/update-journey/update-harness";

const updateScreenSource = readFileSync("apps/mobile/app/update.tsx", "utf8");
const updateFlowSource = readFileSync("apps/mobile/src/hooks/useUpdateCheckFlow.ts", "utf8");
const updateDiagnosticsSource = readFileSync("apps/mobile/src/update/journey-diagnostics.ts", "utf8");
const aboutSource = readFileSync("apps/mobile/app/about.tsx", "utf8");

const RC105_INSTALLED = 21;
const RC106_RELEASE = {
  versionName: "0.1.15-beta.7",
  versionCode: 22,
  sha256: "d25e04bcf65287e0b747b8489a0ff5efb10ab50f663eb4a48250dbabd9715107",
  downloadUrl:
    "https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/artifacts/closed-beta-rc10.6/lot_android_closed_beta_0.1.15_beta.7.apk",
};

describe("P0 — RC10.5→RC10.6 update journey", () => {
  it("A — success path shows exactly one update-available state", async () => {
    const harness = createUpdateJourneyHarness(RC105_INSTALLED);
    await harness.checkSuccess(false);
    const ui = harness.ui();
    expect(ui.showUpdateAvailable).toBe(true);
    expect(ui.showCheckError).toBe(false);
    expect(ui.showDownloadCta).toBe(true);
    expect(harness.isContradictory()).toBe(false);
  });

  it("B — network check failure shows CHECK_ERROR without stale release", async () => {
    const harness = createUpdateJourneyHarness(RC105_INSTALLED);
    await harness.checkNetworkFailure();
    const ui = harness.ui();
    expect(ui.showCheckError).toBe(true);
    expect(ui.showUpdateAvailable).toBe(false);
    expect(ui.showDownloadCta).toBe(false);
    expect(harness.isContradictory()).toBe(false);
  });

  it("C — successful check after failure clears error", async () => {
    const harness = createUpdateJourneyHarness(RC105_INSTALLED);
    await harness.checkNetworkFailure();
    await harness.checkSuccess(false);
    const ui = harness.ui();
    expect(ui.showCheckError).toBe(false);
    expect(ui.showUpdateAvailable).toBe(true);
  });

  it("D — failed check after success clears stale update CTA", async () => {
    const harness = createUpdateJourneyHarness(RC105_INSTALLED);
    await harness.checkSuccess(false);
    await harness.recheckFailureAfterSuccess();
    const ui = harness.ui();
    expect(ui.showCheckError).toBe(true);
    expect(ui.showUpdateAvailable).toBe(false);
    expect(ui.showDownloadCta).toBe(false);
  });

  it("E — old failure after new success is ignored", async () => {
    const harness = createUpdateJourneyHarness(RC105_INSTALLED);
    await harness.raceOldFailureAfterNewSuccess();
    const ui = harness.ui();
    expect(ui.showUpdateAvailable).toBe(true);
    expect(ui.showCheckError).toBe(false);
  });

  it("F — reverse race keeps latest failure without stale success", async () => {
    const guard = createUpdateCheckSequenceGuard();
    const first = guard.next();
    const second = guard.next();
    let snapshot = beginUpdateCheck(second);
    snapshot = completeUpdateCheck(snapshot, { eligible: true, release: RC106_RELEASE, hasCachedApk: false });
    if (guard.isLatest(first)) {
      snapshot = failUpdateCheck(snapshot, "stale success ignored");
    }
    const ui = buildUpdateScreenUiContract(snapshot);
    expect(ui.showUpdateAvailable).toBe(true);
    expect(ui.showCheckError).toBe(false);
  });

  it("G — download failure is DOWNLOAD_ERROR not CHECK_ERROR", async () => {
    const harness = createUpdateJourneyHarness(RC105_INSTALLED);
    await harness.checkSuccess(false);
    harness.beginDownload();
    harness.failDownload();
    const ui = harness.ui();
    expect(ui.showDownloadError).toBe(true);
    expect(ui.showCheckError).toBe(false);
    expect(ui.showDownloadCta).toBe(true);
  });

  it("H — checksum mismatch is VERIFY_ERROR", async () => {
    const harness = createUpdateJourneyHarness(RC105_INSTALLED);
    await harness.checkSuccess(false);
    harness.beginDownload();
    harness.failVerify();
    const ui = harness.ui();
    expect(ui.showVerifyError).toBe(true);
    expect(ui.showCheckError).toBe(false);
  });

  it("I — checksum success reaches READY_TO_INSTALL", async () => {
    const harness = createUpdateJourneyHarness(RC105_INSTALLED);
    await harness.checkSuccess(false);
    harness.beginDownload();
    harness.succeedDownload();
    const ui = harness.ui();
    expect(ui.showReadyToInstall).toBe(true);
    expect(ui.showInstallCta).toBe(true);
  });

  it("J — physical contradiction regression is impossible in canonical state", () => {
    const legacy = legacyBuggyCheckFailure(
      completeUpdateCheck(beginUpdateCheck(1), {
        eligible: true,
        release: RC106_RELEASE,
        hasCachedApk: false,
      }),
      "Не удалось проверить обновление",
    );
    expect(hasUpdateContradiction(legacy)).toBe(true);
    expect(
      legacyUpdateScreenWouldShowContradiction({
        phase: "failed",
        hasUpdate: true,
        updateInfo: { versionName: RC106_RELEASE.versionName },
      }),
    ).toBe(true);

    const fixed = failUpdateCheck(
      completeUpdateCheck(beginUpdateCheck(1), {
        eligible: true,
        release: RC106_RELEASE,
        hasCachedApk: false,
      }),
      "Не удалось проверить обновление. Попробуйте ещё раз.",
    );
    expect(hasUpdateContradiction(fixed)).toBe(false);
    const ui = buildUpdateScreenUiContract(fixed);
    expect(ui.showCheckError).toBe(true);
    expect(ui.showUpdateAvailable).toBe(false);
    expect(ui.showDownloadCta).toBe(false);
  });

  it("live MRP contract for installed code 21 → OPTIONAL_UPDATE code 22", () => {
    const decision = evaluateUpdateDecision(
      {
        versionCode: 22,
        versionName: "0.1.15-beta.7",
        updateState: "OPTIONAL_UPDATE",
        downloadUrl: RC106_RELEASE.downloadUrl,
        sha256: RC106_RELEASE.sha256,
        rollout: { percent: 100, eligible: true },
      },
      RC105_INSTALLED,
    );
    expect(decision.updateState).toBe("OPTIONAL_UPDATE");
    expect(decision.latestVersionCode).toBe(22);
    expect(decision.eligibleForInstall).toBe(true);
  });
});

describe("wiring contracts", () => {
  it("update screen derives from canonical ui contract only", () => {
    expect(updateScreenSource).toContain("ui.showCheckError");
    expect(updateScreenSource).toContain("ui.showUpdateAvailable");
    expect(updateScreenSource).not.toContain("hasUpdate && phase");
    expect(updateScreenSource).not.toContain("availableHint");
  });

  it("update flow clears release on check failure and sequences requests", () => {
    expect(updateFlowSource).toContain("createUpdateCheckSequenceGuard");
    expect(updateFlowSource).toContain("failUpdateCheck");
    expect(updateFlowSource).toContain("beginUpdateCheck");
    expect(updateFlowSource).not.toMatch(/setUpdateInfo\(info\)[\s\S]*catch/);
  });

  it("update diagnostics events are defined", () => {
    expect(updateDiagnosticsSource).toContain("UPDATE_CHECK_STARTED");
    expect(updateDiagnosticsSource).toContain("UPDATE_CHECK_FAILED");
    expect(updateDiagnosticsSource).toContain("UPDATE_AVAILABLE");
    expect(updateDiagnosticsSource).toContain("UPDATE_DOWNLOAD_STARTED");
    expect(updateDiagnosticsSource).toContain("UPDATE_VERIFY_FAILED");
    expect(updateDiagnosticsSource).toContain("UPDATE_INSTALL_HANDOFF");
  });

  it("about screen uses timeless beta copy and diagnostics copy", () => {
    expect(aboutSource).toContain("Скопировать диагностику");
    expect(aboutSource).not.toContain("RC5-сборкой");
    expect(aboutSource).toContain("тестовую сборку");
  });
});
