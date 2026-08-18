import { PromotionCampaignStatus, PromotionOrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { priorityForPlan, resolvePromotionPlan, surfacesForPlan } from "./plan-resolver";
import type { PromotionPlanId } from "./plans";
import type { PromotionDetail, PromotionListItem } from "./types";

const MS_DAY = 24 * 60 * 60 * 1000;

function mapCampaignRow(input: {
  id: string;
  status: PromotionCampaignStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  updatedAt: Date;
  budget: { toNumber(): number } | null;
  product: { id: string; name: string };
  orders: Array<{ amount: { toNumber(): number }; plan: { name: string } | null }>;
  placements: Array<{ surface: string }>;
}): PromotionListItem {
  const latestOrder = input.orders[0];
  return {
    id: input.id,
    kind: "campaign",
    title: latestOrder?.plan?.name ?? "Кампания",
    subtitle: input.product.name,
    status: input.status,
    productId: input.product.id,
    productName: input.product.name,
    amount: latestOrder ? Number(latestOrder.amount) : input.budget ? Number(input.budget) : null,
    startsAt: input.startedAt?.toISOString() ?? null,
    endsAt: input.endedAt?.toISOString() ?? null,
    updatedAt: input.updatedAt.toISOString(),
  };
}

export async function listPromotionCampaigns(sellerProfileId: string): Promise<PromotionListItem[]> {
  const campaigns = await prisma.promotionCampaign.findMany({
    where: { sellerId: sellerProfileId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      product: { select: { id: true, name: true } },
      placements: { select: { surface: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { amount: true, plan: { select: { name: true } } },
      },
    },
  });

  return campaigns.map(mapCampaignRow);
}

export async function getPromotionCampaignDetail(
  sellerProfileId: string,
  campaignId: string,
): Promise<PromotionDetail | null> {
  const campaign = await prisma.promotionCampaign.findFirst({
    where: { id: campaignId, sellerId: sellerProfileId },
    include: {
      product: { select: { id: true, name: true } },
      placements: { select: { surface: true, active: true } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: { select: { id: true, name: true } } },
      },
    },
  });
  if (!campaign) return null;

  const latestOrder = campaign.orders[0];
  const base = mapCampaignRow({ ...campaign, orders: campaign.orders });
  const evidence = [
    { label: "Статус", value: campaign.status },
    ...(campaign.startedAt ? [{ label: "Начало", value: campaign.startedAt.toISOString() }] : []),
    ...(campaign.endedAt ? [{ label: "Окончание", value: campaign.endedAt.toISOString() }] : []),
    { label: "Площадки", value: campaign.placements.map((p) => p.surface).join(", ") || "—" },
  ];

  return {
    ...base,
    planId: latestOrder?.plan?.id ?? null,
    planName: latestOrder?.plan?.name ?? null,
    surfaces: campaign.placements.filter((p) => p.active).map((p) => p.surface),
    evidence,
    editable: campaign.status !== PromotionCampaignStatus.ENDED,
    publishable: campaign.status === PromotionCampaignStatus.PAUSED,
    statisticsAvailable: true,
  };
}

export async function activatePromotionPurchase(input: {
  sellerProfileId: string;
  productId: string;
  planId: PromotionPlanId;
  amount: number;
}): Promise<{ campaignId: string; orderId: string }> {
  const plan = await resolvePromotionPlan(input.planId);
  const product = await prisma.product.findFirst({
    where: { id: input.productId, sellerId: input.sellerProfileId },
    select: { id: true },
  });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  const now = new Date();
  const endsAt = new Date(now.getTime() + plan.days * MS_DAY);
  const surfaces = surfacesForPlan(input.planId);

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.promotionCampaign.upsert({
      where: { productId: input.productId },
      create: {
        productId: input.productId,
        sellerId: input.sellerProfileId,
        status: PromotionCampaignStatus.STARTED,
        budget: input.amount,
        startedAt: now,
        endedAt: endsAt,
      },
      update: {
        status: PromotionCampaignStatus.STARTED,
        budget: input.amount,
        startedAt: now,
        endedAt: endsAt,
      },
    });

    const order = await tx.promotionOrder.create({
      data: {
        sellerId: input.sellerProfileId,
        productId: input.productId,
        planId: plan.dbPlanId,
        campaignId: campaign.id,
        status: PromotionOrderStatus.ACTIVE,
        amount: input.amount,
        startedAt: now,
        endedAt: endsAt,
      },
    });

    for (const surface of surfaces) {
      await tx.promotionPlacement.upsert({
        where: {
          campaignId_surface: {
            campaignId: campaign.id,
            surface,
          },
        },
        create: {
          campaignId: campaign.id,
          productId: input.productId,
          surface,
          active: true,
          priority: priorityForPlan(input.planId),
        },
        update: {
          active: true,
          priority: priorityForPlan(input.planId),
        },
      });
    }

    return { campaignId: campaign.id, orderId: order.id };
  });
}

export async function updatePromotionCampaignStatus(input: {
  sellerProfileId: string;
  campaignId: string;
  status: PromotionCampaignStatus;
}): Promise<PromotionDetail | null> {
  const existing = await prisma.promotionCampaign.findFirst({
    where: { id: input.campaignId, sellerId: input.sellerProfileId },
    select: { id: true },
  });
  if (!existing) return null;

  const now = new Date();
  await prisma.promotionCampaign.update({
    where: { id: input.campaignId },
    data: {
      status: input.status,
      endedAt: input.status === PromotionCampaignStatus.ENDED ? now : undefined,
    },
  });

  if (input.status === PromotionCampaignStatus.ENDED) {
    await prisma.promotionOrder.updateMany({
      where: { campaignId: input.campaignId, status: PromotionOrderStatus.ACTIVE },
      data: { status: PromotionOrderStatus.ENDED, endedAt: now },
    });
    await prisma.promotionPlacement.updateMany({
      where: { campaignId: input.campaignId },
      data: { active: false },
    });
  }

  if (input.status === PromotionCampaignStatus.STARTED) {
    await prisma.promotionPlacement.updateMany({
      where: { campaignId: input.campaignId },
      data: { active: true },
    });
  }

  return getPromotionCampaignDetail(input.sellerProfileId, input.campaignId);
}
