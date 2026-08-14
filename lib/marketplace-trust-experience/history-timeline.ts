import type { TrustScoreHistoryEntry } from "@/lib/marketplace-trust-score/types";

import type { TrustHistoryTimelineEntry } from "./types";

function formatTimelineDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfEntry = new Date(date);
  startOfEntry.setHours(0, 0, 0, 0);

  if (startOfEntry.getTime() === startOfToday.getTime()) return "Сегодня";

  const yesterday = new Date(startOfToday);
  yesterday.setDate(yesterday.getDate() - 1);
  if (startOfEntry.getTime() === yesterday.getTime()) return "Вчера";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(date);
}

export function historyAdvice(entry: TrustScoreHistoryEntry): string {
  if (entry.delta > 0) {
    if (entry.eventType === "REVIEW_CREATED") return "Продолжайте радовать покупателей";
    if (entry.eventType === "ORDER_DELIVERED") return "Отличная работа с доставкой";
    return "Продолжайте в том же духе";
  }

  switch (entry.eventType) {
    case "ORDER_SHIPPED":
      return "Отправляйте товары быстрее";
    case "ORDER_CANCELLED":
      return "Старайтесь не отменять заказы";
    case "REVIEW_CREATED":
      return "Ответьте покупателю и исправьте проблему";
    case "PRODUCT_UPDATED":
      return "Дополните карточки товаров";
    case "ORDER_DELIVERED":
      return "Проверьте качество упаковки и сроки";
    default:
      return "Следуйте рекомендациям в центре доверия";
  }
}

export function buildHistoryTimeline(
  history: TrustScoreHistoryEntry[],
): TrustHistoryTimelineEntry[] {
  return history.map((entry) => ({
    id: entry.id,
    dateLabel: formatTimelineDate(entry.createdAt),
    oldScore: entry.oldScore,
    newScore: entry.newScore,
    delta: entry.delta,
    reason: entry.reason,
    eventType: entry.eventType,
    advice: historyAdvice(entry),
  }));
}

export function computeTrendSummary(input: {
  history: TrustScoreHistoryEntry[];
  windowDays?: number;
}): { delta: number; direction: "up" | "down" | "flat"; mainReason: string | null } {
  const windowDays = input.windowDays ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const recent = input.history.filter((entry) => new Date(entry.createdAt) >= since);
  const delta = recent.reduce((sum, entry) => sum + entry.delta, 0);
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  const mainPositive = recent.find((entry) => entry.delta > 0);
  const mainNegative = recent.find((entry) => entry.delta < 0);
  const main = delta >= 0 ? mainPositive : mainNegative;

  return {
    delta,
    direction,
    mainReason: main?.reason ?? null,
  };
}
