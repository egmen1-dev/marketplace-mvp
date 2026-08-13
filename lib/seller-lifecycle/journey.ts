import { ROUTES } from "@/lib/constants";

import type { SellerProgressSignals } from "./progress";
import type { SellerJourneyStep, SellerLifecycleStage } from "./types";
import {
  JOURNEY_STEP_DEFINITIONS,
  stageIndex,
  STAGE_ORDER,
} from "./types";

const OPTIMIZED_SCORE_THRESHOLD = 70;

export function resolveLifecycleStage(
  signals: SellerProgressSignals,
): SellerLifecycleStage {
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

  if (signals.viewsSum > 0) return "FIRST_VIEWS";

  if (
    signals.activeProducts > 0 &&
    signals.bestCompletenessScore >= OPTIMIZED_SCORE_THRESHOLD
  ) {
    return "PRODUCT_OPTIMIZED";
  }

  if (signals.activeProducts > 0) return "FIRST_PRODUCT_PUBLISHED";

  if (signals.totalProducts > 0) return "FIRST_PRODUCT_CREATED";

  return "SELLER_ACTIVATED";
}

export function buildJourneySteps(input: {
  stage: SellerLifecycleStage;
  signals: SellerProgressSignals;
}): SellerJourneyStep[] {
  const currentIndex = stageIndex(input.stage);

  const steps = JOURNEY_STEP_DEFINITIONS.map((def) => {
    const minIndex = stageIndex(def.minStage);
    return {
      id: def.id,
      label: def.label,
      done: currentIndex >= minIndex,
      current: false,
      href: stepHref(def.id),
    };
  });

  const firstOpen = steps.find((s) => !s.done);
  if (firstOpen) firstOpen.current = true;

  return steps;
}

function stepHref(stepId: string): string | undefined {
  switch (stepId) {
    case "product":
    case "published":
      return ROUTES.ACCOUNT_PRODUCTS_NEW;
    case "views":
    case "order":
      return ROUTES.ACCOUNT_PRODUCTS;
    case "completed":
      return ROUTES.ACCOUNT_SALES;
    case "balance":
      return ROUTES.ACCOUNT_BALANCE;
    case "payout":
      return ROUTES.ACCOUNT_PAYOUTS;
    default:
      return undefined;
  }
}

export function computeJourneyProgress(steps: SellerJourneyStep[]): {
  current: number;
  total: number;
} {
  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const hasCurrent = steps.some((s) => s.current);
  return {
    current: hasCurrent ? doneCount + 1 : doneCount,
    total,
  };
}

export function pickNextJourneyStep(
  steps: SellerJourneyStep[],
): SellerJourneyStep | null {
  return steps.find((s) => s.current) ?? steps.find((s) => !s.done) ?? null;
}

export function isStageAtLeast(
  stage: SellerLifecycleStage,
  min: SellerLifecycleStage,
): boolean {
  return stageIndex(stage) >= stageIndex(min);
}

export { STAGE_ORDER };
