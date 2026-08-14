import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import type { SellerJourneyStep } from "./types";

const QUALITY_THRESHOLD = 70;
const LOW_VIEWS_THRESHOLD = 5;

export function resolveSellerJourneyStep(
  signals: SellerProgressSignals,
): SellerJourneyStep {
  if (!signals.isSeller) return "NOT_STARTED";

  if (signals.completedPayouts > 0 || signals.paidAmount > 0) {
    if (signals.ordersCount >= 3 || signals.activeProducts >= 3) {
      return "GROWING_SELLER";
    }
    return "FIRST_PAYOUT";
  }

  if (signals.availableBalance > 0) return "BALANCE_AVAILABLE";

  if (signals.completedOrdersCount > 0) return "ORDER_COMPLETED";

  if (signals.ordersCount > 0) return "FIRST_ORDER";

  if (signals.cartAdds > 0) return "FIRST_CART";

  if (signals.viewsSum > 0) return "FIRST_VISITS";

  if (signals.activeProducts > 0) {
    if (signals.bestCompletenessScore >= QUALITY_THRESHOLD) {
      if (signals.viewsSum === 0) return "PRODUCT_READY";
      return "FIRST_VISITS";
    }
    return "PRODUCT_PUBLISHED";
  }

  if (signals.totalProducts > 0) return "FIRST_PRODUCT_CREATED";

  return "SELLER_STARTED";
}

/** Views are low but product is ready — still in acquisition phase. */
export function hasLowVisibility(signals: SellerProgressSignals): boolean {
  return (
    signals.activeProducts > 0 &&
    signals.viewsSum > 0 &&
    signals.viewsSum < LOW_VIEWS_THRESHOLD &&
    signals.ordersCount === 0
  );
}

export function hasViewsWithoutOrders(signals: SellerProgressSignals): boolean {
  return signals.viewsSum > 0 && signals.ordersCount === 0;
}

export function isJourneyComplete(step: SellerJourneyStep): boolean {
  return step === "FIRST_PAYOUT" || step === "GROWING_SELLER";
}
