"use server";

import { revalidatePath } from "next/cache";

import {
  AuthRequiredError,
  requireSellerSession,
  SellerRequiredError,
} from "@/features/auth";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";
import {
  endPromotionCampaign,
  pausePromotionCampaign,
  PromotionForbiddenError,
  PromotionValidationError,
  startPromotionCampaign,
} from "@/lib/promotion";

export type PromotionActionState = {
  ok: boolean;
  error?: string;
};

function mapError(err: unknown): PromotionActionState {
  if (err instanceof AuthRequiredError) {
    return { ok: false, error: "Войдите в аккаунт" };
  }
  if (err instanceof SellerRequiredError) {
    return { ok: false, error: "Нужен профиль продавца" };
  }
  if (err instanceof PromotionForbiddenError) {
    return { ok: false, error: err.message };
  }
  if (err instanceof PromotionValidationError) {
    return { ok: false, error: err.message };
  }
  console.error("[promotion-action]", err);
  return { ok: false, error: "Не удалось обновить продвижение" };
}

function revalidatePromotionPaths(productId?: string) {
  revalidatePath(ROUTES.ACCOUNT_PROMOTIONS);
  revalidatePath(ROUTES.ADMIN_PROMOTIONS);
  revalidatePath(ROUTES.HOME);
  revalidatePath(ROUTES.CATALOG);
  if (productId) {
    revalidatePath(`${ROUTES.PRODUCT}/${productId}`);
  }
}

export async function startPromotionAction(
  productId: string,
): Promise<PromotionActionState> {
  try {
    const seller = await requireSellerSession();
    await startPromotionCampaign(seller.sellerProfileId, productId);
    await trackServerEvent({
      event: ANALYTICS_EVENTS.PROMOTION_START,
      route: ROUTES.ACCOUNT_PROMOTIONS,
      entityId: productId,
    });
    revalidatePromotionPaths(productId);
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function pausePromotionAction(
  productId: string,
): Promise<PromotionActionState> {
  try {
    const seller = await requireSellerSession();
    await pausePromotionCampaign(seller.sellerProfileId, productId);
    await trackServerEvent({
      event: ANALYTICS_EVENTS.PROMOTION_PAUSE,
      route: ROUTES.ACCOUNT_PROMOTIONS,
      entityId: productId,
    });
    revalidatePromotionPaths(productId);
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function endPromotionAction(
  productId: string,
): Promise<PromotionActionState> {
  try {
    const seller = await requireSellerSession();
    await endPromotionCampaign(seller.sellerProfileId, productId);
    revalidatePromotionPaths(productId);
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}
