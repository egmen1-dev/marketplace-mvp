import type { PromotionOrderStatus } from "@prisma/client";

export type PromotionPlanDto = {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  active: boolean;
};

export type PromotionOrderDto = {
  id: string;
  sellerId: string;
  productId: string;
  planId: string;
  campaignId: string | null;
  status: PromotionOrderStatus;
  amount: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  plan?: PromotionPlanDto;
};

export type AdminPromotionBillingSummary = {
  totalRevenue: number;
  activePaidCampaigns: number;
  paidOrders: number;
};
