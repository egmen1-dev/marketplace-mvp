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
  readyToInstall: "Обновление скачано",
  installCta: "Установить",
  alreadyDownloaded: "Обновление уже скачано",
  installerOpened: "Подтвердите установку в окне Android",
  allowInstallCta: "Разрешить",
  installFailed: "Не удалось проверить обновление",
  retry: "Повторить",
  profileBadge: "Обновление доступно",
} as const;

export type UpdateUiPhase =
  | "checking"
  | "up_to_date"
  | "available"
  | "downloading"
  | "ready_to_install"
  | "installer_opened"
  | "failed";
