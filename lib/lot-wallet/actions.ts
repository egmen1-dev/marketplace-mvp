"use server";

import { getSessionUser } from "@/features/auth";
import { revalidatePath } from "next/cache";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { createWalletTopUpCheckoutSession } from "./topup";
import { isLotWalletEnabled } from "./flags";

export async function startWalletTopUpAction(amountRub: number) {
  if (!isLotWalletEnabled()) {
    return { ok: false as const, error: "Кошелёк ЛОТ временно недоступен" };
  }

  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: "Войдите в аккаунт" };
  }

  void trackServerEvent({
    event: ANALYTICS_EVENTS.WALLET_TOPUP_STARTED,
    route: ROUTES.ACCOUNT_WALLET,
    entityId: user.id,
  });

  const result = await createWalletTopUpCheckoutSession({
    userId: user.id,
    email: user.email,
    amountRub,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath(ROUTES.ACCOUNT_WALLET);
  return result;
}
