import type { SellerProgressSignals } from "./progress";
import type { SellerMilestone, SellerMilestoneType } from "./types";
import { milestoneEmoji, milestoneLabel } from "./types";

export function detectMilestones(
  signals: SellerProgressSignals,
): SellerMilestone[] {
  const checks: Array<{ type: SellerMilestoneType; achieved: boolean }> = [
    { type: "FIRST_PRODUCT", achieved: signals.activeProducts > 0 },
    { type: "FIRST_VIEW", achieved: signals.viewsSum > 0 },
    { type: "FIRST_FAVORITE", achieved: signals.favoritesSum > 0 },
    { type: "FIRST_CART", achieved: signals.cartAdds > 0 },
    { type: "FIRST_ORDER", achieved: signals.ordersCount > 0 },
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
  milestones: SellerMilestone[],
): SellerMilestone | null {
  const achieved = milestones.filter((m) => m.achievedAt);
  return achieved.at(-1) ?? null;
}
