/** User-facing Russian labels for the Closed Beta update flow. */
export const UPDATE_UI_LABELS = {
  checking: "Проверяем обновления",
  available: "Доступна новая версия",
  downloading: "Скачиваем обновление",
  downloaded: "Обновление загружено",
  install: "Установить обновление",
  installerOpened: "Открыт установщик Android",
  upToDate: "Установлена актуальная версия",
  installFailed: "Не удалось установить обновление",
  browserHandoff:
    "Загрузка откроется в браузере. После скачивания подтвердите установку в системном диалоге Android.",
} as const;

export type UpdateUiPhase = keyof typeof UPDATE_UI_LABELS;
