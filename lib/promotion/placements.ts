import { PromotionSurfaceType, type Prisma } from "@prisma/client";

import {
  DEFAULT_CAMPAIGN_PLACEMENTS,
  mapPriorityToBoostWeight,
  type PromotionBoostSignal,
} from "@/lib/promotion/surfaces";
import type { PromotionPlacementDto } from "@/lib/promotion/types";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

function mapPlacement(row: {
  id: string;
  campaignId: string;
  productId: string;
  surface: PromotionSurfaceType;
  position: number;
  priority: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PromotionPlacementDto {
  return {
    id: row.id,
    campaignId: row.campaignId,
    productId: row.productId,
    surface: row.surface,
    position: row.position,
    priority: row.priority,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Ensure default placements exist and mark them active for a STARTED campaign. */
export async function activatePlacementsForCampaign(
  campaignId: string,
  productId: string,
  tx: Tx,
): Promise<void> {
  for (const spec of DEFAULT_CAMPAIGN_PLACEMENTS) {
    await tx.promotionPlacement.upsert({
      where: {
        campaignId_surface: {
          campaignId,
          surface: spec.surface,
        },
      },
      create: {
        campaignId,
        productId,
        surface: spec.surface,
        position: spec.position,
        priority: spec.priority,
        active: true,
      },
      update: {
        productId,
        position: spec.position,
        priority: spec.priority,
        active: true,
      },
    });
  }
}

export async function deactivatePlacementsForCampaign(
  campaignId: string,
  tx: Tx,
): Promise<void> {
  await tx.promotionPlacement.updateMany({
    where: { campaignId },
    data: { active: false },
  });
}

export async function listPlacementsForCampaign(
  campaignId: string,
  tx: Tx | typeof prisma = prisma,
): Promise<PromotionPlacementDto[]> {
  const rows = await tx.promotionPlacement.findMany({
    where: { campaignId },
    orderBy: [{ priority: "desc" }, { surface: "asc" }],
  });
  return rows.map(mapPlacement);
}

export async function listPlacementsForProduct(
  productId: string,
): Promise<PromotionPlacementDto[]> {
  const rows = await prisma.promotionPlacement.findMany({
    where: { productId, active: true },
    orderBy: [{ priority: "desc" }, { surface: "asc" }],
  });
  return rows.map(mapPlacement);
}

export async function countActivePlacementsForCampaign(
  campaignId: string,
): Promise<number> {
  return prisma.promotionPlacement.count({
    where: { campaignId, active: true },
  });
}

/**
 * Search boost contract — returned for diagnostics/future use only.
 * Does NOT alter search ranking.
 */
export async function getPromotionBoostSignals(): Promise<PromotionBoostSignal[]> {
  const rows = await prisma.promotionPlacement.findMany({
    where: {
      active: true,
      surface: PromotionSurfaceType.SEARCH_BOOST,
      campaign: { status: "STARTED" },
    },
    select: { productId: true, priority: true },
    orderBy: { priority: "desc" },
    take: 100,
  });

  return rows.map((row) => ({
    productId: row.productId,
    boostWeight: mapPriorityToBoostWeight(row.priority),
    reason: "PROMOTION" as const,
  }));
}
