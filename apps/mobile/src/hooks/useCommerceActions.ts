import { useCallback, useEffect, useRef } from "react";

import { addToCart, removeCartItem, toggleFavorite, updateCartQuantity } from "../api/endpoints";
import { ApiClientError } from "../api/client";
import { useCartQuantitiesStore } from "../commerce/cart-quantities-store";
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
  const hydrateFavorites = useFavoritesStore((s) => s.hydrate);
  const setFavorite = useFavoritesStore((s) => s.setFavorite);
  const cartHydrated = useCartQuantitiesStore((s) => s.hydrated);
  const hydrateCart = useCartQuantitiesStore((s) => s.hydrate);
  const setCartQuantity = useCartQuantitiesStore((s) => s.setQuantity);
  const busyRef = useRef(new Set<string>());

  useEffect(() => {
    if (!hydrated) void hydrateFavorites();
    if (!cartHydrated) void hydrateCart();
  }, [hydrateFavorites, hydrateCart, hydrated, cartHydrated]);

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
        const current = useCartQuantitiesStore.getState().quantities[productId] ?? 0;
        setCartQuantity(productId, current + quantity);
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
    [offline, setCartQuantity],
  );

  const changeProductCartQuantity = useCallback(
    async (productId: string, nextQuantity: number) => {
      const key = `cart:${productId}`;
      if (busyRef.current.has(key)) return;
      if (offline) {
        showCommerceToast("Для этого действия требуется интернет", "error");
        return;
      }
      busyRef.current.add(key);
      try {
        if (nextQuantity <= 0) {
          await removeCartItem(productId);
          setCartQuantity(productId, 0);
        } else {
          await updateCartQuantity(productId, nextQuantity);
          setCartQuantity(productId, nextQuantity);
        }
        await refreshTabBadges();
      } catch (err) {
        if (handleCommerceAuthFailure(err)) {
          showCommerceToast("Войдите в аккаунт для этого действия", "error");
        } else {
          showCommerceToast(formatCommerceError(err), "error");
        }
        throw err;
      } finally {
        busyRef.current.delete(key);
      }
    },
    [offline, setCartQuantity],
  );

  const incrementProductCart = useCallback(
    async (productId: string) => {
      const current = useCartQuantitiesStore.getState().quantities[productId] ?? 0;
      await changeProductCartQuantity(productId, current + 1);
    },
    [changeProductCartQuantity],
  );

  const decrementProductCart = useCallback(
    async (productId: string) => {
      const current = useCartQuantitiesStore.getState().quantities[productId] ?? 0;
      await changeProductCartQuantity(productId, Math.max(0, current - 1));
    },
    [changeProductCartQuantity],
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
    incrementProductCart,
    decrementProductCart,
    toggleProductFavorite,
    favoritesHydrated: hydrated,
    cartHydrated,
  };
}
