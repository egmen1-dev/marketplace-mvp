/** RC10.5 (commit 91b9c1d) update flow types — frozen for bridge harness. */

export type Rc105UpdateFlowError =
  | "network_error"
  | "download_url_unavailable"
  | "download_failed"
  | "incompatible_apk"
  | "update_cancelled"
  | "installer_permission_unavailable"
  | "sha_verification_failed"
  | "install_handoff_failed";

export const RC105_UPDATE_ERROR_MESSAGES: Record<Rc105UpdateFlowError, string> = {
  network_error: "Не удалось проверить обновление. Проверьте интернет и попробуйте позже.",
  download_url_unavailable:
    "Ссылка на обновление временно недоступна. Попробуйте позже или обратитесь в поддержку.",
  download_failed: "Не удалось скачать обновление. Попробуйте ещё раз.",
  incompatible_apk: "Эта сборка несовместима с вашим устройством.",
  update_cancelled: "Обновление отменено.",
  installer_permission_unavailable:
    "Чтобы установить обновление, разрешите LOT устанавливать обновления.",
  sha_verification_failed: "Не удалось проверить обновление. Попробуйте ещё раз.",
  install_handoff_failed: "Не удалось открыть установщик Android. Попробуйте ещё раз.",
};

export const RC105_UI_LABELS = {
  installFailed: "Не удалось проверить обновление",
} as const;

export type Rc105UiPhase =
  | "checking"
  | "up_to_date"
  | "available"
  | "downloading"
  | "ready_to_install"
  | "installer_opened"
  | "failed";

export type Rc105UpdateInfo = {
  versionName: string;
  versionCode: number;
  downloadUrl: string | null;
  sha256: string | null;
  updateState: string;
  rollout: { eligible: boolean };
};

export type Rc105CheckSnapshot = {
  phase: Rc105UiPhase;
  updateInfo: Rc105UpdateInfo | null;
  errorMessage: string | null;
  hasCachedApk: boolean;
};

export function mapRc105UpdateError(err: unknown): Rc105UpdateFlowError {
  if (err instanceof Error) {
    if (/network|fetch|timeout/i.test(err.message)) return "network_error";
    if (/cancel/i.test(err.message)) return "update_cancelled";
    if (/sha256|verify/i.test(err.message)) return "sha_verification_failed";
    if (/content_uri|install|handoff/i.test(err.message)) return "install_handoff_failed";
  }
  return "download_failed";
}

export function getRc105UpdateErrorMessage(code: Rc105UpdateFlowError): string {
  return RC105_UPDATE_ERROR_MESSAGES[code];
}

export function isRc105UpdateEligible(info: Rc105UpdateInfo | null, installedCode: number): boolean {
  if (!info) return false;
  if (!info.rollout.eligible) return false;
  return info.versionCode > installedCode && Boolean(info.downloadUrl);
}

/** RC10.5 update.tsx availableHint visibility (lines 84–91 @ 91b9c1d). */
export function rc105WouldShowAvailableHint(snapshot: Rc105CheckSnapshot, installedCode: number): boolean {
  return (
    isRc105UpdateEligible(snapshot.updateInfo, installedCode) &&
    snapshot.phase !== "available" &&
    snapshot.phase !== "downloading" &&
    snapshot.phase !== "ready_to_install" &&
    snapshot.updateInfo != null
  );
}
