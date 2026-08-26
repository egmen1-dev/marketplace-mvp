const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активный",
  DRAFT: "Сохранён",
  ARCHIVED: "В архиве",
  OUT_OF_STOCK: "Нет в наличии",
};

const MODERATION_LABELS: Record<string, string> = {
  PENDING_REVIEW: "На проверке",
  NEEDS_FIX: "Нужно исправить",
  REJECTED: "Отклонён",
  APPROVED: "Одобрен",
};

export function productStatusLabel(status: string | undefined | null): string {
  if (!status) return "—";
  return STATUS_LABELS[status] ?? status;
}

export function moderationStatusLabel(status: string | undefined | null): string | null {
  if (!status) return null;
  return MODERATION_LABELS[status] ?? status;
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

export function sellerLotSectionTone(
  section: string,
): "success" | "warning" | "neutral" | "danger" {
  switch (section) {
    case "active":
      return "success";
    case "pending":
    case "needs_fix":
      return "warning";
    case "rejected":
      return "danger";
    default:
      return "neutral";
  }
}
