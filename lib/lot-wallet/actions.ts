"use server";

import { getSessionUser } from "@/features/auth";
import { revalidatePath } from "next/cache";

import { ROUTES } from "@/lib/constants";

import { trackWalletTopupStarted } from "./analytics";
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

  trackWalletTopupStarted();
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
