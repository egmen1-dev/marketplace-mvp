/** User-facing Russian labels for the Closed Beta update flow. */
export const UPDATE_UI_LABELS = {
  checking: "Проверяем обновления…",
  upToDate: "У вас установлена актуальная версия",
  available: "Доступно обновление",
  availableBody: "Мы улучшили создание ЛОТов и исправили ошибки",
  updateNow: "Обновить сейчас",
  later: "Позже",
  downloadCta: "Скачать обновление",
  downloading: "Скачиваем обновление…",
  verifying: "Проверяем целостность обновления…",
  preparingInstall: "Подготавливаем установку…",
  readyToInstall: "Обновление скачано",
  installCta: "Установить",
  alreadyDownloaded: "Обновление уже скачано",
  installerOpened: "Подтвердите установку в окне Android",
  allowInstallCta: "Разрешить установку",
  installFailed: "Не удалось проверить обновление",
  checkFailed: "Не удалось проверить обновление. Попробуйте ещё раз.",
  downloadFailed: "Не удалось скачать обновление. Попробуйте ещё раз.",
  verifyFailed: "Не удалось проверить целостность обновления",
  installHandoffFailed: "Не удалось открыть установщик Android. Попробуйте ещё раз.",
  installPermissionRequired: "Чтобы установить обновление, разрешите ЛОТ устанавливать приложения.",
  retry: "Повторить",
  profileBadge: "Обновление доступно",
} as const;

export type UpdateUiPhase =
  | "checking"
  | "up_to_date"
  | "available"
  | "downloading"
  | "verifying"
  | "ready_to_install"
  | "installer_opened"
  | "install_permission"
  | "failed";
