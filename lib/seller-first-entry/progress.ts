import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import type { SellerFirstEntryStep } from "./types";
import { firstEntryStepIndex } from "./types";

const QUALITY_THRESHOLD = 70;

export function resolveFirstEntryStep(
  signals: SellerProgressSignals,
): SellerFirstEntryStep {
  if (!signals.isSeller) return "SELLER_START";

  if (signals.completedPayouts > 0 || signals.paidAmount > 0) {
    return "FIRST_PAYOUT";
  }

  if (signals.availableBalance > 0) return "BALANCE_AVAILABLE";

  if (signals.ordersCount > 0) return "FIRST_ORDER";

  if (signals.viewsSum > 0) return "FIRST_VIEWS";

  if (signals.activeProducts > 0) {
    if (signals.bestCompletenessScore >= QUALITY_THRESHOLD) {
      return "CARD_IMPROVED";
    }
    return "PRODUCT_PUBLISHED";
  }

  if (signals.totalProducts > 0) return "PRODUCT_CREATED";

  return "SELLER_START";
}

export function buildFirstEntryJourney(currentStep: SellerFirstEntryStep) {
  const currentIndex = firstEntryStepIndex(currentStep);

  const items = [
    { id: "create", label: "Создать товар", minIndex: firstEntryStepIndex("PRODUCT_CREATED") },
    { id: "card", label: "Сделать сильную карточку", minIndex: firstEntryStepIndex("CARD_IMPROVED") },
    { id: "views", label: "Получить первые просмотры", minIndex: firstEntryStepIndex("FIRST_VIEWS") },
    { id: "order", label: "Получить первый заказ", minIndex: firstEntryStepIndex("FIRST_ORDER") },
    { id: "money", label: "Получить деньги", minIndex: firstEntryStepIndex("FIRST_PAYOUT") },
  ].map((item) => ({
    id: item.id,
    label: item.label,
    done: currentIndex >= item.minIndex,
    current: false,
  }));

  const firstOpen = items.find((j) => !j.done);
  if (firstOpen) firstOpen.current = true;

  return items;
}

export function computeFirstEntryProgress(currentStep: SellerFirstEntryStep): {
  current: number;
  total: number;
} {
  const journey = buildFirstEntryJourney(currentStep);
  const done = journey.filter((j) => j.done).length;
  const hasCurrent = journey.some((j) => j.current);
  return { current: hasCurrent ? done + 1 : done, total: 5 };
}

export function isFirstEntryComplete(step: SellerFirstEntryStep): boolean {
  return firstEntryStepIndex(step) >= firstEntryStepIndex("FIRST_PAYOUT");
}
