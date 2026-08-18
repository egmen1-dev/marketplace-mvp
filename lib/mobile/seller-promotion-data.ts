import { PromotionCampaignStatus } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { payInternalProduct } from "@/lib/lot-wallet/payment";
import {
  activatePromotionPurchase,
  getPromotionCampaignDetail,
  getPromotionCenterSections,
  getPromotionPlan,
  listPromotionCampaigns,
  listPromotionDiscounts,
  listPromotionFeatured,
  listPromotionHistory,
  listPromotionPerformance,
  loadPromotionEligibility,
  updatePromotionCampaignStatus,
  updatePromotionDiscount,
} from "@/lib/seller-promotion-center";
import type { PromotionPlanId } from "@/lib/seller-promotion-center/plans";

import { buildMobileSellerPromotionPayload } from "./seller-promotion-types";
import { trackSellerPromotionEvent } from "./seller-promotion-telemetry";

export async function buildMobileSellerPromotionFromRequest(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return buildMobileSellerPromotionPayload({
      generatedAt: new Date().toISOString(),
      enabled: false,
      sections: [],
      campaigns: [],
      discounts: [],
      featured: [],
      history: [],
      performance: [],
      eligibility: [],
      plans: [],
      summary: {
        activeCampaigns: 0,
        spent30d: 0,
        orders30d: 0,
        revenue30d: 0,
        discountCount: 0,
      },
      cacheVersion: "promotion-v1",
      retryAfterMs: 60_000,
      advisoryOnly: true,
    });
  }

  const sections = await getPromotionCenterSections(user.sellerProfileId);
  trackSellerPromotionEvent("promotion_opened", {
    sellerProfileId: user.sellerProfileId,
    activeCampaigns: sections.summary.activeCampaigns,
  });
  return buildMobileSellerPromotionPayload(sections);
}

export async function publishMobileSellerPromotionFromRequest(
  request: Request,
  body: { productId: string; planId: PromotionPlanId; paymentMethod?: "wallet" | "card" },
) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { ok: false as const, error: "UNAUTHORIZED" };
  }

  const plan = getPromotionPlan(body.planId);
  if (!plan) return { ok: false as const, error: "UNKNOWN_PLAN" };

  if (body.paymentMethod === "card") {
    return { ok: false as const, error: "CARD_NOT_SUPPORTED" };
  }

  const payment = await payInternalProduct({
    userId: user.id,
    sellerProfileId: user.sellerProfileId,
    productType: "PROMOTION",
    amount: plan.price,
    referenceId: `${body.productId}:${body.planId}`,
    title: `Продвижение · ${plan.name} · ${plan.days} дн.`,
    idempotencyKey: `promo:${user.sellerProfileId}:${body.productId}:${body.planId}`,
  });
  if (!payment.ok) return payment;

  const activated = await activatePromotionPurchase({
    sellerProfileId: user.sellerProfileId,
    productId: body.productId,
    planId: body.planId,
    amount: plan.price,
  });

  trackSellerPromotionEvent("promotion_published", {
    sellerProfileId: user.sellerProfileId,
    campaignId: activated.campaignId,
    productId: body.productId,
    planId: body.planId,
  });
  trackSellerPromotionEvent("promotion_created", {
    sellerProfileId: user.sellerProfileId,
    campaignId: activated.campaignId,
  });

  const detail = await getPromotionCampaignDetail(user.sellerProfileId, activated.campaignId);
  return { ok: true as const, campaign: detail, orderId: activated.orderId };
}

export async function updateMobileSellerPromotionCampaignFromRequest(
  request: Request,
  campaignId: string,
  body: { status: "STARTED" | "PAUSED" | "ENDED" },
) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { ok: false as const, error: "UNAUTHORIZED" };
  }

  const detail = await updatePromotionCampaignStatus({
    sellerProfileId: user.sellerProfileId,
    campaignId,
    status: body.status as PromotionCampaignStatus,
  });
  if (!detail) return { ok: false as const, error: "NOT_FOUND" };

  trackSellerPromotionEvent(
    body.status === "ENDED" ? "promotion_finished" : "promotion_updated",
    { sellerProfileId: user.sellerProfileId, campaignId, status: body.status },
  );

  return { ok: true as const, campaign: detail };
}

export async function updateMobileSellerPromotionDiscountFromRequest(
  request: Request,
  productId: string,
  body: { compareAt: number | null },
) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { ok: false as const, error: "UNAUTHORIZED" };
  }

  try {
    const row = await updatePromotionDiscount({
      sellerProfileId: user.sellerProfileId,
      productId,
      compareAt: body.compareAt,
    });
    if (!row) return { ok: false as const, error: "NOT_FOUND" };
    trackSellerPromotionEvent("promotion_updated", {
      sellerProfileId: user.sellerProfileId,
      productId,
      kind: "discount",
    });
    return { ok: true as const, discount: row };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "UPDATE_FAILED",
    };
  }
}

export {
  listPromotionCampaigns,
  getPromotionCampaignDetail,
  listPromotionDiscounts,
  listPromotionFeatured,
  listPromotionHistory,
  listPromotionPerformance,
  loadPromotionEligibility,
};
