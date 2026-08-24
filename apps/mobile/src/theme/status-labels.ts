const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активный",
  DRAFT: "Сохранён",
  ARCHIVED: "В архиве",
  OUT_OF_STOCK: "Нет в наличии",
};

export function productStatusLabel(status: string | undefined | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status] ?? status;
}

export function productStatusTone(status: string | undefined | null): "success" | "warning" | "neutral" | "danger" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "DRAFT":
      return "warning";
    case "OUT_OF_STOCK":
      return "danger";
    default:
      return "neutral";
  }
}
