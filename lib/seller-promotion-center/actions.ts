"use server";

import { revalidatePath } from "next/cache";

import { requireSellerSession } from "@/features/auth";
import { payInternalProduct } from "@/lib/lot-wallet/payment";
import { ROUTES } from "@/lib/constants";

import { getPromotionPlan } from "./plans";
import type { PromotionPlanId } from "./plans";
import { activatePromotionPurchase } from "./campaigns";

export type PurchasePromotionState = { ok: boolean; error?: string; campaignId?: string; orderId?: string };

export async function purchasePromotionAction(input: {
  productId: string;
  planId: PromotionPlanId;
  paymentMethod: "wallet" | "card";
}): Promise<PurchasePromotionState> {
  const seller = await requireSellerSession();
  const plan = getPromotionPlan(input.planId);
  if (!plan) return { ok: false, error: "Неизвестный тариф" };

  if (input.paymentMethod === "card") {
    return {
      ok: false,
      error: "Оплата картой для продвижения скоро будет доступна. Используйте кошелёк ЛОТ.",
    };
  }

  const result = await payInternalProduct({
    userId: seller.userId,
    sellerProfileId: seller.sellerProfileId,
    productType: "PROMOTION",
    amount: plan.price,
    referenceId: `${input.productId}:${input.planId}`,
    title: `Продвижение · ${plan.name} · ${plan.days} дн.`,
    idempotencyKey: `promo:${seller.sellerProfileId}:${input.productId}:${input.planId}`,
  });

  if (!result.ok) return result;

  try {
    const activated = await activatePromotionPurchase({
      sellerProfileId: seller.sellerProfileId,
      productId: input.productId,
      planId: input.planId,
      amount: plan.price,
    });
    revalidatePath(ROUTES.ACCOUNT_PROMOTION_CENTER);
    revalidatePath(ROUTES.ACCOUNT_WALLET);
    revalidatePath(ROUTES.ACCOUNT_BUSINESS);
    return { ok: true, campaignId: activated.campaignId, orderId: activated.orderId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Не удалось активировать кампанию",
    };
  }
}
