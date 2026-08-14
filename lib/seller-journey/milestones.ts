import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import type { SellerJourneyMilestone, SellerJourneyMilestoneType } from "./types";
import { milestoneEmoji, milestoneLabel } from "./types";

export function detectJourneyMilestones(
  signals: SellerProgressSignals,
): SellerJourneyMilestone[] {
  const checks: Array<{ type: SellerJourneyMilestoneType; achieved: boolean }> = [
    { type: "FIRST_PRODUCT", achieved: signals.activeProducts > 0 },
    { type: "FIRST_VIEW", achieved: signals.viewsSum > 0 },
    { type: "FIRST_CART", achieved: signals.cartAdds > 0 },
    { type: "FIRST_ORDER", achieved: signals.ordersCount > 0 },
    { type: "FIRST_COMPLETED_ORDER", achieved: signals.completedOrdersCount > 0 },
    {
      type: "FIRST_PAYOUT",
      achieved: signals.completedPayouts > 0 || signals.paidAmount > 0,
    },
  ];

  return checks.map(({ type, achieved }) => ({
    type,
    label: milestoneLabel(type),
    emoji: milestoneEmoji(type),
    achievedAt: achieved ? new Date().toISOString() : null,
  }));
}

export function latestAchievedMilestone(
  milestones: SellerJourneyMilestone[],
): SellerJourneyMilestone | null {
  const achieved = milestones.filter((m) => m.achievedAt);
  return achieved.at(-1) ?? null;
}

export function newlyAchievedMilestones(
  previous: SellerJourneyMilestone[],
  current: SellerJourneyMilestone[],
): SellerJourneyMilestone[] {
  const prevTypes = new Set(
    previous.filter((m) => m.achievedAt).map((m) => m.type),
  );
  return current.filter((m) => m.achievedAt && !prevTypes.has(m.type));
}
