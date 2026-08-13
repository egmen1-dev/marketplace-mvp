import {
  PromotionCampaignStatus,
  PromotionOrderStatus,
} from "@prisma/client";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/** End paid promotion periods — safe to call from cron. */
export async function expireDuePromotionOrders(): Promise<number> {
  const now = new Date();
  const due = await prisma.promotionOrder.findMany({
    where: {
      status: PromotionOrderStatus.ACTIVE,
      endedAt: { lte: now },
    },
    select: {
      id: true,
      productId: true,
      campaignId: true,
    },
  });

  if (due.length === 0) return 0;

  for (const order of due) {
    await prisma.$transaction(async (tx) => {
      await tx.promotionOrder.update({
        where: { id: order.id },
        data: { status: PromotionOrderStatus.ENDED },
      });

      if (order.campaignId) {
        await tx.promotionCampaign.update({
          where: { id: order.campaignId },
          data: {
            status: PromotionCampaignStatus.ENDED,
            endedAt: now,
          },
        });
        const { deactivatePlacementsForCampaign } = await import(
          "@/lib/promotion/placements"
        );
        await deactivatePlacementsForCampaign(order.campaignId, tx);
      }
    });

    await trackServerEvent({
      event: ANALYTICS_EVENTS.PROMOTION_EXPIRED,
      route: ROUTES.ACCOUNT_PROMOTIONS,
      entityId: order.productId,
    });

    log.info("promotion_order_expired", {
      promotionOrderId: order.id,
      productId: order.productId,
    });
  }

  return due.length;
}
