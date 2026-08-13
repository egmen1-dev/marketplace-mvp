import {
  PromotionCampaignStatus,
  PromotionOrderStatus,
  type Prisma,
} from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";
import {
  getPromotionPlanById,
  calculatePromotionEndDate,
} from "@/lib/promotion/billing/plans";
import type {
  PromotionOrderDto,
  PromotionPlanDto,
} from "@/lib/promotion/billing/types";
import { evaluatePromotionReadiness } from "@/lib/promotion/readiness";
import {
  assertSellerOwnsProduct,
  PromotionValidationError,
} from "@/lib/promotion/permissions";
import { prisma } from "@/lib/prisma";

function mapOrder(
  row: {
    id: string;
    sellerId: string;
    productId: string;
    planId: string;
    campaignId: string | null;
    status: PromotionOrderStatus;
    amount: Prisma.Decimal;
    createdAt: Date;
    startedAt: Date | null;
    endedAt: Date | null;
  },
  plan?: PromotionPlanDto,
): PromotionOrderDto {
  return {
    id: row.id,
    sellerId: row.sellerId,
    productId: row.productId,
    planId: row.planId,
    campaignId: row.campaignId,
    status: row.status,
    amount: toPriceNumber(row.amount),
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    plan,
  };
}

async function loadPromotionProductSource(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { select: { id: true } },
      seller: { select: { isBlocked: true, isVerified: true } },
      productType: {
        select: {
          characteristics: {
            where: { required: true },
            select: { id: true },
          },
        },
      },
      characteristicValues: {
        select: {
          definitionId: true,
          valueText: true,
          valueNumber: true,
          valueBoolean: true,
          valueJson: true,
        },
      },
    },
  });
  if (!product) {
    throw new PromotionValidationError("Товар не найден");
  }

  const requiredIds = new Set(
    product.productType?.characteristics.map((c) => c.id) ?? [],
  );
  const filledRequired = product.characteristicValues.filter((cv) => {
    if (!requiredIds.has(cv.definitionId)) return false;
    if (cv.valueText?.trim()) return true;
    if (cv.valueNumber != null) return true;
    if (cv.valueBoolean != null) return true;
    if (cv.valueJson != null) return true;
    return false;
  }).length;

  return {
    product,
    readiness: evaluatePromotionReadiness({
      status: product.status,
      stock: product.stock,
      price: toPriceNumber(product.price),
      title: product.name,
      description: product.description,
      productTypeId: product.productTypeId,
      categoryId: product.categoryId,
      imageCount: product.images.length,
      sellerId: product.sellerId,
      sellerBlocked: product.seller.isBlocked,
      sellerVerified: product.seller.isVerified,
      requiredCharacteristicCount: requiredIds.size,
      filledRequiredCharacteristicCount: filledRequired,
      characteristicCount: product.characteristicValues.length,
    }),
  };
}

export async function createPromotionOrder(
  sellerProfileId: string,
  productId: string,
  planId: string,
): Promise<PromotionOrderDto> {
  await assertSellerOwnsProduct(sellerProfileId, productId);
  const plan = await getPromotionPlanById(planId);
  if (!plan) {
    throw new PromotionValidationError("Тариф продвижения не найден");
  }

  const { readiness } = await loadPromotionProductSource(productId);
  if (!readiness.ready) {
    throw new PromotionValidationError(
      readiness.blockers[0] ?? "Товар не готов к продвижению",
    );
  }

  const pending = await prisma.promotionOrder.findFirst({
    where: {
      productId,
      sellerId: sellerProfileId,
      status: { in: [PromotionOrderStatus.CREATED, PromotionOrderStatus.PAYMENT_PENDING] },
    },
  });
  if (pending) {
    throw new PromotionValidationError(
      "Уже есть незавершённый заказ на продвижение",
    );
  }

  const row = await prisma.promotionOrder.create({
    data: {
      sellerId: sellerProfileId,
      productId,
      planId: plan.id,
      amount: plan.price,
      status: PromotionOrderStatus.CREATED,
    },
  });

  await trackServerEvent({
    event: ANALYTICS_EVENTS.PROMOTION_PURCHASE_STARTED,
    route: ROUTES.ACCOUNT_PROMOTIONS,
    entityId: productId,
  });

  return mapOrder(row, plan);
}

export async function getPromotionOrderForSeller(
  sellerProfileId: string,
  promotionOrderId: string,
): Promise<PromotionOrderDto | null> {
  const row = await prisma.promotionOrder.findFirst({
    where: { id: promotionOrderId, sellerId: sellerProfileId },
    include: { plan: true },
  });
  if (!row) return null;
  return mapOrder(row, mapPlanFromRow(row.plan));
}

function mapPlanFromRow(row: {
  id: string;
  name: string;
  durationDays: number;
  price: Prisma.Decimal;
  active: boolean;
}): PromotionPlanDto {
  return {
    id: row.id,
    name: row.name,
    durationDays: row.durationDays,
    price: toPriceNumber(row.price),
    active: row.active,
  };
}

export async function getActivePromotionOrderForProduct(
  productId: string,
): Promise<PromotionOrderDto | null> {
  const row = await prisma.promotionOrder.findFirst({
    where: {
      productId,
      status: PromotionOrderStatus.ACTIVE,
    },
    orderBy: { endedAt: "desc" },
    include: { plan: true },
  });
  if (!row) return null;
  return mapOrder(row, mapPlanFromRow(row.plan));
}

export async function getLatestPromotionOrderForProduct(
  productId: string,
): Promise<PromotionOrderDto | null> {
  const row = await prisma.promotionOrder.findFirst({
    where: {
      productId,
      status: {
        in: [
          PromotionOrderStatus.ACTIVE,
          PromotionOrderStatus.ENDED,
          PromotionOrderStatus.PAID,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  if (!row) return null;
  return mapOrder(row, mapPlanFromRow(row.plan));
}

/** Sum paid promotion spend linked to a campaign — used for ROI. */
export async function getPromotionCostForCampaign(
  campaignId: string,
): Promise<number> {
  const aggregate = await prisma.promotionOrder.aggregate({
    where: {
      campaignId,
      status: {
        in: [
          PromotionOrderStatus.PAID,
          PromotionOrderStatus.ACTIVE,
          PromotionOrderStatus.ENDED,
        ],
      },
    },
    _sum: { amount: true },
  });
  return aggregate._sum.amount ? toPriceNumber(aggregate._sum.amount) : 0;
}

export async function getSellerPromotionOrderMap(
  productIds: string[],
): Promise<Map<string, PromotionOrderDto>> {
  const map = new Map<string, PromotionOrderDto>();
  if (productIds.length === 0) return map;

  const rows = await prisma.promotionOrder.findMany({
    where: {
      productId: { in: productIds },
      status: {
        in: [
          PromotionOrderStatus.ACTIVE,
          PromotionOrderStatus.PAYMENT_PENDING,
          PromotionOrderStatus.CREATED,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  for (const row of rows) {
    if (!map.has(row.productId)) {
      map.set(row.productId, mapOrder(row, mapPlanFromRow(row.plan)));
    }
  }
  return map;
}

export function resolvePromotionPeriod(opts: {
  now: Date;
  plan: PromotionPlanDto;
  existingEnd: Date | null;
}): { startedAt: Date; endedAt: Date } {
  const { now, plan, existingEnd } = opts;
  const extendFrom =
    existingEnd && existingEnd.getTime() > now.getTime() ? existingEnd : now;
  const startedAt =
    existingEnd && existingEnd.getTime() > now.getTime() ? existingEnd : now;
  return {
    startedAt,
    endedAt: calculatePromotionEndDate(extendFrom, plan.durationDays),
  };
}

export async function isCampaignPaidActive(campaignId: string): Promise<boolean> {
  const count = await prisma.promotionOrder.count({
    where: {
      campaignId,
      status: PromotionOrderStatus.ACTIVE,
    },
  });
  return count > 0;
}

export async function countActivePaidCampaigns(): Promise<number> {
  return prisma.promotionCampaign.count({
    where: {
      status: PromotionCampaignStatus.STARTED,
      orders: { some: { status: PromotionOrderStatus.ACTIVE } },
    },
  });
}
