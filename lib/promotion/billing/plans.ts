import { type Prisma } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import type { PromotionPlanDto } from "@/lib/promotion/billing/types";
import { prisma } from "@/lib/prisma";

export const DEFAULT_PROMOTION_PLANS = [
  { name: "STARTER", durationDays: 7, price: 990 },
  { name: "GROWTH", durationDays: 14, price: 1790 },
  { name: "BOOST", durationDays: 30, price: 2990 },
] as const;

function mapPlan(row: {
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

export async function listActivePromotionPlans(): Promise<PromotionPlanDto[]> {
  const rows = await prisma.promotionPlan.findMany({
    where: { active: true },
    orderBy: { durationDays: "asc" },
  });
  return rows.map(mapPlan);
}

export async function getPromotionPlanById(
  planId: string,
): Promise<PromotionPlanDto | null> {
  const row = await prisma.promotionPlan.findFirst({
    where: { id: planId, active: true },
  });
  return row ? mapPlan(row) : null;
}

/** Inclusive end-of-day boundary for seller-facing expiry date. */
export function calculatePromotionEndDate(
  start: Date,
  durationDays: number,
): Date {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + durationDays);
  return end;
}

export function formatPromotionPeriodLabel(durationDays: number): string {
  return `${durationDays} ${durationDays === 1 ? "день" : durationDays < 5 ? "дня" : "дней"}`;
}
