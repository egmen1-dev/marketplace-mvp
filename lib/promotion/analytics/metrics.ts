import { Prisma } from "@prisma/client";

import type { MetricIncrementField } from "@/lib/promotion/analytics/types";
import { prisma } from "@/lib/prisma";

export function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export async function incrementPromotionMetric(opts: {
  campaignId: string;
  productId: string;
  field: MetricIncrementField;
  amount?: number;
  revenueDelta?: number;
  at?: Date;
}): Promise<void> {
  const date = startOfUtcDay(opts.at);
  const amount = opts.amount ?? 1;
  const revenueDelta = opts.revenueDelta ?? 0;

  await prisma.promotionMetric.upsert({
    where: {
      campaignId_date: {
        campaignId: opts.campaignId,
        date,
      },
    },
    create: {
      campaignId: opts.campaignId,
      productId: opts.productId,
      date,
      impressions: opts.field === "impressions" ? amount : 0,
      clicks: opts.field === "clicks" ? amount : 0,
      productViews: opts.field === "productViews" ? amount : 0,
      addToCart: opts.field === "addToCart" ? amount : 0,
      checkoutStarted: opts.field === "checkoutStarted" ? amount : 0,
      orders: opts.field === "orders" ? amount : 0,
      revenue:
        revenueDelta > 0
          ? new Prisma.Decimal(revenueDelta.toFixed(2))
          : new Prisma.Decimal("0"),
    },
    update: {
      [opts.field]: { increment: amount },
      ...(revenueDelta > 0
        ? { revenue: { increment: new Prisma.Decimal(revenueDelta.toFixed(2)) } }
        : {}),
    },
  });
}

export async function findActiveCampaignForProduct(productId: string) {
  return prisma.promotionCampaign.findFirst({
    where: {
      productId,
      status: "STARTED",
    },
    select: { id: true, productId: true, budget: true },
  });
}
