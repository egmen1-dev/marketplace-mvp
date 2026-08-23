import { useCallback, useEffect, useRef } from "react";

import { addToCart, toggleFavorite } from "../api/endpoints";
import { ApiClientError } from "../api/client";
import { useAppStore } from "../store/app-store";
import { showCommerceToast } from "../commerce/commerce-toast-store";
import { handleCommerceAuthFailure, trackCommerceAction } from "../commerce/commerce-telemetry";
import { useFavoritesStore } from "../commerce/favorites-store";
import { refreshTabBadges } from "../commerce/refresh-tab-badges";

function formatCommerceError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.code === "UNAUTHORIZED" || err.status === 401) return "Войдите в аккаунт для этого действия";
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Не удалось выполнить действие";
}

export function useCommerceActions() {
  const offline = useAppStore((s) => s.offline);
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const hydrated = useFavoritesStore((s) => s.hydrated);
  const hydrate = useFavoritesStore((s) => s.hydrate);
  const setFavorite = useFavoritesStore((s) => s.setFavorite);
  const busyRef = useRef(new Set<string>());

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrate, hydrated]);

  const isFavorite = useCallback((productId: string) => favoriteIds.has(productId), [favoriteIds]);

  const addProductToCart = useCallback(
    async (productId: string, quantity = 1) => {
      const key = `cart:${productId}`;
      if (busyRef.current.has(key)) return;
      if (offline) {
        showCommerceToast("Для этого действия требуется интернет", "error");
        return;
      }
      busyRef.current.add(key);
      const startedAt = Date.now();
      try {
        await addToCart(productId, quantity);
        await refreshTabBadges();
        showCommerceToast("Добавлено в корзину", "success");
        await trackCommerceAction({
          action: "add_to_cart",
          productId,
          endpoint: "/api/cart",
          startedAt,
          success: true,
        });
      } catch (err) {
        if (handleCommerceAuthFailure(err)) {
          showCommerceToast("Войдите в аккаунт для этого действия", "error");
        } else {
          showCommerceToast(formatCommerceError(err), "error");
        }
        await trackCommerceAction({
          action: "add_to_cart",
          productId,
          endpoint: "/api/cart",
          startedAt,
          success: false,
          error: err,
        });
        throw err;
      } finally {
        busyRef.current.delete(key);
      }
    },
    [offline],
  );

  const toggleProductFavorite = useCallback(
    async (productId: string) => {
      const key = `fav:${productId}`;
      if (busyRef.current.has(key)) return;
      if (offline) {
        showCommerceToast("Для этого действия требуется интернет", "error");
        return;
      }
      const wasFavorite = favoriteIds.has(productId);
      setFavorite(productId, !wasFavorite);
      busyRef.current.add(key);
      const startedAt = Date.now();
      try {
        const res = await toggleFavorite(productId);
        setFavorite(productId, res.isFavorite);
        await refreshTabBadges();
        showCommerceToast(res.isFavorite ? "Добавлено в избранное" : "Удалено из избранного", "success");
        await trackCommerceAction({
          action: "toggle_favorite",
          productId,
          endpoint: "/api/mobile/favorites",
          startedAt,
          success: true,
        });
      } catch (err) {
        setFavorite(productId, wasFavorite);
        if (handleCommerceAuthFailure(err)) {
          showCommerceToast("Войдите в аккаунт для этого действия", "error");
        } else {
          showCommerceToast(formatCommerceError(err), "error");
        }
        await trackCommerceAction({
          action: "toggle_favorite",
          productId,
          endpoint: "/api/mobile/favorites",
          startedAt,
          success: false,
          error: err,
        });
        throw err;
      } finally {
        busyRef.current.delete(key);
      }
    },
    [favoriteIds, offline, setFavorite],
  );

  return {
    isFavorite,
    addProductToCart,
    toggleProductFavorite,
    favoritesHydrated: hydrated,
  };
}
