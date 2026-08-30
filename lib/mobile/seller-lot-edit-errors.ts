export function formatLotEditLoadError(err: unknown): string {
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : null;
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err && "message" in err
        ? String((err as { message?: string }).message ?? "")
        : "";

  if (status === 404) {
    return "ЛОТ не найден. Возможно, он был удалён или у вас нет доступа.";
  }
  if (status === 403) {
    return "Нет доступа к этому ЛОТу.";
  }
  if (status === 401) {
    return "Войдите в аккаунт продавца, чтобы редактировать ЛОТ.";
  }
  if (message && !message.match(/^(404|403|500|HTTP)/i)) {
    return message;
  }
  return "Не удалось загрузить ЛОТ для редактирования";
}
