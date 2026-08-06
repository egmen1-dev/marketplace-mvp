"use server";

import { revalidatePath } from "next/cache";

import {
  getUserProfile,
  listRecentlyViewedProducts,
  recordProductView,
  updateUserProfile,
} from "@/features/account/queries";
import { updateProfileSchema } from "@/features/account/schemas";
import type { ProfileUpdateResult } from "@/features/account/types";
import { AuthRequiredError, getSessionUser } from "@/features/auth";
import { ROUTES } from "@/lib/constants";

function revalidateAccountPaths() {
  revalidatePath(ROUTES.ACCOUNT);
  revalidatePath(ROUTES.PROFILE);
  revalidatePath(ROUTES.SETTINGS);
  revalidatePath(ROUTES.HISTORY);
  revalidatePath(ROUTES.PROFILE_HISTORY);
}

export async function getProfileAction() {
  const user = await getSessionUser();
  if (!user) return null;
  return getUserProfile(user.id);
}

export async function updateProfileAction(
  input: unknown,
): Promise<ProfileUpdateResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Требуется вход" };
  }

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверьте поля формы",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    const profile = await updateUserProfile(user.id, parsed.data);
    revalidateAccountPaths();
    return { ok: true, profile };
  } catch (err) {
    console.error("[updateProfileAction]", err);
    return { ok: false, error: "Не удалось сохранить профиль" };
  }
}

/** Fire-and-forget friendly: records view when session exists. */
export async function recordProductViewAction(
  productId: string,
): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  if (!productId?.trim()) return { ok: false };

  try {
    await recordProductView(user.id, productId);
    return { ok: true };
  } catch (err) {
    console.error("[recordProductViewAction]", err);
    return { ok: false };
  }
}

export async function listHistoryAction() {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthRequiredError();
  }
  return listRecentlyViewedProducts(user.id);
}
