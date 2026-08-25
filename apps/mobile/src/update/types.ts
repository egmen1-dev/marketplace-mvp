export type MobileUpdateState =
  | "NO_UPDATE"
  | "OPTIONAL_UPDATE"
  | "RECOMMENDED_UPDATE"
  | "REQUIRED_UPDATE"
  | "UNSUPPORTED_CLIENT";

export type UpdateFlowError =
  | "network_error"
  | "download_url_unavailable"
  | "download_failed"
  | "incompatible_apk"
  | "update_cancelled"
  | "installer_permission_unavailable"
  | "sha_verification_failed"
  | "install_handoff_failed";

export const UPDATE_ERROR_MESSAGES: Record<UpdateFlowError, string> = {
  network_error: "Не удалось проверить обновление. Проверьте интернет и попробуйте позже.",
  download_url_unavailable: "Ссылка на обновление временно недоступна. Попробуйте позже или обратитесь в поддержку.",
  download_failed: "Не удалось скачать обновление. Попробуйте ещё раз.",
  incompatible_apk: "Эта сборка несовместима с вашим устройством.",
  update_cancelled: "Обновление отменено.",
  installer_permission_unavailable:
    "Чтобы установить обновление, разрешите LOT устанавливать обновления.",
  sha_verification_failed: "Не удалось проверить обновление. Попробуйте ещё раз.",
  install_handoff_failed: "Не удалось открыть установщик Android. Попробуйте ещё раз.",
};

export const UPDATE_DEFER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const UPDATE_ANALYTICS = {
  available: "update_available",
  viewed: "update_viewed",
  started: "update_started",
  deferred: "update_deferred",
  downloaded: "update_downloaded",
  installOpened: "update_install_opened",
  failed: "update_failed",
} as const;
