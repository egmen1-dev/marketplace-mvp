import { PROMOTION_ATTRIBUTION_WINDOW_DAYS } from "@/lib/promotion/analytics/types";
import { prisma } from "@/lib/prisma";

export async function touchPromotionAttribution(opts: {
  campaignId: string;
  productId: string;
  visitorId: string;
  at?: Date;
}): Promise<void> {
  const now = opts.at ?? new Date();
  await prisma.promotionAttribution.upsert({
    where: {
      campaignId_visitorId: {
        campaignId: opts.campaignId,
        visitorId: opts.visitorId,
      },
    },
    create: {
      campaignId: opts.campaignId,
      productId: opts.productId,
      visitorId: opts.visitorId,
      firstTouchAt: now,
      lastTouchAt: now,
    },
    update: {
      lastTouchAt: now,
      productId: opts.productId,
    },
  });
}

export async function findActivePromotionAttribution(opts: {
  visitorId: string;
  productId: string;
  at?: Date;
}): Promise<{ campaignId: string; productId: string } | null> {
  const now = opts.at ?? new Date();
  const windowStart = new Date(
    now.getTime() - PROMOTION_ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const row = await prisma.promotionAttribution.findFirst({
    where: {
      visitorId: opts.visitorId,
      productId: opts.productId,
      lastTouchAt: { gte: windowStart },
      campaign: { status: "STARTED" },
    },
    orderBy: { lastTouchAt: "desc" },
    select: { campaignId: true, productId: true },
  });

  return row;
}
