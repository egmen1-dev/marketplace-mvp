/** Human-readable boot copy — never expose raw stage ids to users. */
const STAGE_MESSAGES: Record<string, string> = {
  app_init: "Запускаем LOT",
  api_health: "Проверяем соединение",
  bootstrap: "Загружаем товары",
  session_restore: "Восстанавливаем сессию",
  session_refresh: "Восстанавливаем сессию",
  session_token: "Восстанавливаем сессию",
  session_meta: "Восстанавливаем сессию",
  remote_config: "Настраиваем приложение",
  update_check: "Проверяем обновления",
  navigation: "Почти готово",
};

export function bootStageToUserMessage(stage: string): string {
  return STAGE_MESSAGES[stage] ?? "Запускаем LOT";
}
