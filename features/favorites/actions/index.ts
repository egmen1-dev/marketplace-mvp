"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/features/auth";
import {
  FavoriteServiceError,
  listFavoriteIds,
  listFavoriteProducts,
  toggleFavorite,
} from "@/features/favorites/queries";
import { ROUTES } from "@/lib/constants";

export type FavoriteToggleActionResult =
  | { ok: true; isFavorite: boolean; favoritesCount: number }
  | { ok: false; error: string; code?: "AUTH_REQUIRED" };

function revalidateFavorites() {
  revalidatePath(ROUTES.FAVORITES);
  revalidatePath(ROUTES.ACCOUNT);
  revalidatePath(ROUTES.CATALOG);
  revalidatePath(ROUTES.HOME);
}

export async function getFavoriteIdsAction(): Promise<string[]> {
  const user = await getSessionUser();
  if (!user) return [];
  return listFavoriteIds(user.id);
}

export async function listFavoritesAction() {
  const user = await getSessionUser();
  if (!user) return [];
  return listFavoriteProducts(user.id);
}

export async function toggleFavoriteAction(
  productId: string,
): Promise<FavoriteToggleActionResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Требуется вход", code: "AUTH_REQUIRED" };
  }

  if (!productId?.trim()) {
    return { ok: false, error: "Некорректный товар" };
  }

  try {
    const result = await toggleFavorite(user.id, productId.trim());
    revalidateFavorites();
    revalidatePath(`${ROUTES.PRODUCT}/${productId}`);
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof FavoriteServiceError) {
      return { ok: false, error: err.message };
    }
    console.error("[toggleFavoriteAction]", err);
    return { ok: false, error: "Не удалось обновить избранное" };
  }
}
