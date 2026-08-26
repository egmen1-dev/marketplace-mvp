/**
 * Deterministic update journey harness — reproduces RC10.5 physical contradiction and fixed behavior.
 */

import { createUpdateCheckSequenceGuard } from "./request-sequencing";
import {
  beginUpdateCheck,
  buildUpdateScreenUiContract,
  completeDownloadReady,
  completeInstallerHandoff,
  completeUpdateCheck,
  failDownload,
  failUpdateCheck,
  failInstallHandoff,
  failVerify,
  hasUpdateContradiction,
  legacyBuggyCheckFailure,
  type UpdateJourneySnapshot,
  type UpdateReleaseSnapshot,
} from "./update-state";

export type UpdateHarnessRelease = UpdateReleaseSnapshot;

export function createUpdateJourneyHarness(installedVersionCode = 21) {
  const sequenceGuard = createUpdateCheckSequenceGuard();
  let snapshot: UpdateJourneySnapshot = {
    phase: "IDLE",
    availableRelease: null,
    errorStage: null,
    errorMessage: null,
    activeCheckSequence: 0,
    hasCachedApk: false,
  };

  const release: UpdateHarnessRelease = {
    versionName: "0.1.15-beta.7",
    versionCode: 22,
    sha256: "d25e04bcf65287e0b747b8489a0ff5efb10ab50f663eb4a48250dbabd9715107",
    downloadUrl:
      "https://raw.githubusercontent.com/egmen1-dev/marketplace-mvp/main/artifacts/closed-beta-rc10.6/lot_android_closed_beta_0.1.15_beta.7.apk",
  };

  function ui() {
    return buildUpdateScreenUiContract(snapshot);
  }

  async function runCheck(
    impl: () => Promise<{ ok: true; hasCachedApk?: boolean } | { ok: false; message: string }>,
    sequence?: number,
  ) {
    const seq = sequence ?? sequenceGuard.next();
    snapshot = beginUpdateCheck(seq);
    const result = await impl();
    if (!sequenceGuard.isLatest(seq)) return snapshot;
    if (!result.ok) {
      snapshot = failUpdateCheck(snapshot, result.message);
      return snapshot;
    }
    snapshot = completeUpdateCheck(snapshot, {
      eligible: release.versionCode > installedVersionCode,
      release,
      hasCachedApk: result.hasCachedApk ?? false,
    });
    return snapshot;
  }

  return {
    getSnapshot: () => ({ ...snapshot }),
    ui,
    isContradictory: () => hasUpdateContradiction(snapshot),
    release,

    async checkSuccess(hasCachedApk = false) {
      return runCheck(async () => ({ ok: true, hasCachedApk }));
    },

    async checkNetworkFailure(message = "Не удалось проверить обновление. Попробуйте ещё раз.") {
      return runCheck(async () => ({ ok: false, message }));
    },

    /** RC10.5 bug: fetch succeeds, cache lookup throws, release left set. */
    simulateLegacyPartialSuccessThenFailure(message = "Не удалось проверить обновление") {
      const seq = sequenceGuard.next();
      snapshot = beginUpdateCheck(seq);
      snapshot = completeUpdateCheck(snapshot, {
        eligible: true,
        release,
        hasCachedApk: false,
      });
      snapshot = legacyBuggyCheckFailure(snapshot, message);
      return snapshot;
    },

    async checkWithLateFailureAfterSuccess() {
      const first = sequenceGuard.next();
      const second = sequenceGuard.next();
      snapshot = beginUpdateCheck(second);
      snapshot = completeUpdateCheck(snapshot, { eligible: true, release, hasCachedApk: false });
      if (sequenceGuard.isLatest(first)) {
        snapshot = failUpdateCheck(snapshot, "stale failure");
      }
      return snapshot;
    },

    async raceOldFailureAfterNewSuccess() {
      const slow = sequenceGuard.next();
      const fast = sequenceGuard.next();
      snapshot = beginUpdateCheck(fast);
      snapshot = completeUpdateCheck(snapshot, { eligible: true, release, hasCachedApk: false });
      if (sequenceGuard.isLatest(slow)) {
        snapshot = failUpdateCheck(snapshot, "stale");
      }
      return snapshot;
    },

    async retryAfterFailure() {
      await runCheck(async () => ({ ok: false, message: "network" }));
      return runCheck(async () => ({ ok: true, hasCachedApk: false }));
    },

    async recheckFailureAfterSuccess() {
      await runCheck(async () => ({ ok: true, hasCachedApk: false }));
      return runCheck(async () => ({ ok: false, message: "network" }));
    },

    beginDownload() {
      snapshot = { ...snapshot, phase: "DOWNLOADING" };
      return snapshot;
    },

    failDownload(message = "Не удалось скачать обновление. Попробуйте ещё раз.") {
      snapshot = failDownload(snapshot, message);
      return snapshot;
    },

    failVerify(message = "Не удалось проверить целостность обновления") {
      snapshot = failVerify(snapshot, message);
      return snapshot;
    },

    succeedDownload() {
      snapshot = completeDownloadReady(snapshot);
      return snapshot;
    },

    succeedInstallHandoff() {
      snapshot = completeInstallerHandoff(snapshot);
      return snapshot;
    },

    failInstallHandoff(message = "Не удалось открыть установщик Android") {
      snapshot = failInstallHandoff(snapshot, message);
      return snapshot;
    },
  };
}
