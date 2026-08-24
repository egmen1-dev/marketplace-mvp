/** User-facing Russian labels for the Closed Beta update flow. */
export const UPDATE_UI_LABELS = {
  checking: "Проверяем обновления…",
  upToDate: "У вас установлена актуальная версия",
  available: "Доступно обновление",
  availableBody: "Мы улучшили создание ЛОТов и исправили ошибки",
  updateNow: "Обновить сейчас",
  later: "Позже",
  downloadCta: "Скачать обновление",
  installerOpened: "Открыт установщик Android",
  browserHandoff:
    "APK откроется в браузере. После загрузки подтвердите установку в Android.",
  installFailed: "Не удалось проверить обновление",
  retry: "Повторить",
  profileBadge: "Обновление доступно",
} as const;

export type UpdateUiPhase = "checking" | "up_to_date" | "available" | "handoff" | "failed";
