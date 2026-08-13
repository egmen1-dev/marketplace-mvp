import type { PromotionCampaignStatus } from "@prisma/client";

import { formatPromotionPeriodLabel } from "@/lib/promotion/billing/plans";
import type { SellerPromotionRow } from "@/lib/promotion/types";

import type { PromotionCampaignCard } from "./types";

function mapStatus(row: SellerPromotionRow): PromotionCampaignCard["status"] {
  if (row.isPromoted) return "ACTIVE";
  if (row.campaign?.status === "PAUSED") return "PAUSED";
  if (row.campaign?.status === "ENDED") return "ENDED";
  return "INACTIVE";
}

function statusLabel(status: PromotionCampaignCard["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "Активна";
    case "PAUSED":
      return "На паузе";
    case "ENDED":
      return "Завершена";
    default:
      return "Не запущена";
  }
}

export function buildCampaignCards(rows: SellerPromotionRow[]): PromotionCampaignCard[] {
  return rows
    .filter((row) => row.campaign || row.isPromoted || row.activeOrder)
    .map((row) => {
      const status = mapStatus(row);
      const durationDays = row.activeOrder?.plan?.durationDays ?? null;
      return {
        campaignId: row.campaign?.id ?? row.productId,
        productId: row.productId,
        productTitle: row.title,
        imageUrl: row.imageUrl,
        status,
        statusLabel: statusLabel(status),
        periodLabel:
          durationDays != null
            ? formatPromotionPeriodLabel(durationDays)
            : row.campaign?.startedAt
              ? "Активный период"
              : null,
        budget: row.activeOrder?.amount ?? row.campaign?.budget ?? null,
        performance: row.performance,
        planName: row.activeOrder?.plan?.name ?? null,
      };
    });
}

export function campaignStatusFromPrisma(
  status: PromotionCampaignStatus,
  isPromoted: boolean,
): PromotionCampaignCard["status"] {
  if (isPromoted) return "ACTIVE";
  if (status === "PAUSED") return "PAUSED";
  if (status === "ENDED") return "ENDED";
  return "INACTIVE";
}
