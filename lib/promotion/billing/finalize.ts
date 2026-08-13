import {
  PromotionCampaignStatus,
  PromotionOrderStatus,
} from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { PaymentServiceError } from "@/features/payments/errors";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";
import { log } from "@/lib/logger";
import { resolvePromotionPeriod } from "@/lib/promotion/billing/orders";
import { PromotionValidationError } from "@/lib/promotion/permissions";
import { prisma } from "@/lib/prisma";

export type FinalizePaidPromotionInput = {
  promotionOrderId: string;
  stripeSessionId?: string;
  paidAmount?: number;
  currency?: string;
};

export async function finalizePaidPromotionOrder(
  input: FinalizePaidPromotionInput,
): Promise<{ promotionOrderId: string | null; alreadyPaid: boolean }> {
  const order = await prisma.promotionOrder.findUnique({
    where: { id: input.promotionOrderId },
    include: {
      plan: true,
      product: { select: { name: true, currency: true } },
    },
  });

  if (!order) {
    throw new PaymentServiceError("ORDER_NOT_FOUND", "Promotion order not found");
  }

  if (
    order.status === PromotionOrderStatus.ACTIVE ||
    order.status === PromotionOrderStatus.ENDED
  ) {
    return { promotionOrderId: order.id, alreadyPaid: true };
  }

  if (input.paidAmount != null) {
    const expected = toPriceNumber(order.amount);
    if (Math.abs(input.paidAmount - expected) > 0.01) {
      throw new PaymentServiceError(
        "AMOUNT_MISMATCH",
        `Expected ${expected}, got ${input.paidAmount}`,
      );
    }
  }

  if (input.currency) {
    const expected = order.product.currency.trim().toLowerCase() || "rub";
    if (input.currency.toLowerCase() !== expected) {
      throw new PaymentServiceError(
        "CURRENCY_MISMATCH",
        `Expected ${expected}, got ${input.currency}`,
      );
    }
  }

  const now = new Date();
  const planDto = {
    id: order.plan.id,
    name: order.plan.name,
    durationDays: order.plan.durationDays,
    price: toPriceNumber(order.plan.price),
    active: order.plan.active,
  };

  const existingCampaign = await prisma.promotionCampaign.findUnique({
    where: { productId: order.productId },
    select: { id: true, endedAt: true, status: true },
  });

  const { startedAt, endedAt } = resolvePromotionPeriod({
    now,
    plan: planDto,
    existingEnd: existingCampaign?.endedAt ?? null,
  });

  const campaignId = await prisma.$transaction(async (tx) => {
    const campaign = existingCampaign
      ? await tx.promotionCampaign.update({
          where: { id: existingCampaign.id },
          data: {
            status: PromotionCampaignStatus.STARTED,
            startedAt: existingCampaign.status === PromotionCampaignStatus.STARTED
              ? undefined
              : startedAt,
            endedAt,
            budget: order.amount,
          },
        })
      : await tx.promotionCampaign.create({
          data: {
            productId: order.productId,
            sellerId: order.sellerId,
            status: PromotionCampaignStatus.STARTED,
            startedAt,
            endedAt,
            budget: order.amount,
          },
        });

    const { activatePlacementsForCampaign } = await import(
      "@/lib/promotion/placements"
    );
    await activatePlacementsForCampaign(campaign.id, order.productId, tx);

    await tx.promotionOrder.update({
      where: { id: order.id },
      data: {
        status: PromotionOrderStatus.ACTIVE,
        campaignId: campaign.id,
        startedAt,
        endedAt,
        ...(input.stripeSessionId
          ? { stripeSessionId: input.stripeSessionId }
          : {}),
      },
    });

    return campaign.id;
  });

  await trackServerEvent({
    event: ANALYTICS_EVENTS.PROMOTION_PAYMENT_SUCCESS,
    route: ROUTES.ACCOUNT_PROMOTIONS,
    entityId: order.productId,
  });

  log.info("promotion_payment_finalized", {
    promotionOrderId: order.id,
    campaignId,
    productId: order.productId,
  });

  return { promotionOrderId: order.id, alreadyPaid: false };
}

/** E2E / ops helper — finalize without Stripe when billing tests need it. */
export async function finalizePromotionOrderForTesting(
  promotionOrderId: string,
): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new PromotionValidationError("Not available in production");
  }
  await finalizePaidPromotionOrder({ promotionOrderId });
}
