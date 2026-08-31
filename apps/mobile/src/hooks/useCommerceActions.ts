import { useCallback, useEffect } from "react";

import { addToCart, fetchCart, removeCartItem, toggleFavorite, updateCartQuantity } from "../api/endpoints";
import { ApiClientError } from "../api/client";
import { resolveCartProductQuantity } from "../commerce/cart-response";
import { useCartQuantitiesStore } from "../commerce/cart-quantities-store";
import { selectCartBusyProductIds, selectFavoriteBusyProductIds, useCommerceBusyStore } from "../commerce/commerce-busy-store";
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

async function reconcileCartQuantity(productId: string, setCartQuantity: (productId: string, quantity: number) => void) {
  try {
    const cart = await fetchCart();
    const quantity = resolveCartProductQuantity(cart, productId);
    if (quantity !== null) setCartQuantity(productId, quantity);
  } catch {
    // Keep the last known quantity when reconciliation is unavailable.
  }
}

function applyAuthoritativeCartQuantity(
  cartResponse: Record<string, unknown>,
  productId: string,
  setCartQuantity: (productId: string, quantity: number) => void,
  fallbackQuantity: number,
) {
  const quantity = resolveCartProductQuantity(cartResponse, productId);
  if (quantity !== null) {
    setCartQuantity(productId, quantity);
    return;
  }
  setCartQuantity(productId, fallbackQuantity);
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
  const setCartBusy = useCommerceBusyStore((s) => s.setCartBusy);
  const setFavoriteBusy = useCommerceBusyStore((s) => s.setFavoriteBusy);
  const cartBusyProductIds = useCommerceBusyStore(selectCartBusyProductIds);
  const favoriteBusyProductIds = useCommerceBusyStore(selectFavoriteBusyProductIds);

  useEffect(() => {
    if (!hydrated) void hydrateFavorites();
    if (!cartHydrated) void hydrateCart();
  }, [hydrateFavorites, hydrateCart, hydrated, cartHydrated]);

  const isFavorite = useCallback((productId: string) => favoriteIds.has(productId), [favoriteIds]);
  const isCartBusy = useCallback((productId: string) => useCommerceBusyStore.getState().isCartBusy(productId), []);
  const isFavoriteBusy = useCallback(
    (productId: string) => useCommerceBusyStore.getState().isFavoriteBusy(productId),
    [],
  );

  const addProductToCart = useCallback(
    async (productId: string, quantity = 1) => {
      if (useCommerceBusyStore.getState().isCartBusy(productId)) return;
      if (offline) {
        showCommerceToast("Для этого действия требуется интернет", "error");
        return;
      }

      const previousQuantity = useCartQuantitiesStore.getState().quantities[productId] ?? 0;
      setCartBusy(productId, true);
      const startedAt = Date.now();
      try {
        const response = await addToCart(productId, quantity);
        applyAuthoritativeCartQuantity(response, productId, setCartQuantity, previousQuantity + quantity);
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
        await reconcileCartQuantity(productId, setCartQuantity);
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
        setCartBusy(productId, false);
      }
    },
    [offline, setCartBusy, setCartQuantity],
  );

  const changeProductCartQuantity = useCallback(
    async (productId: string, nextQuantity: number) => {
      if (useCommerceBusyStore.getState().isCartBusy(productId)) return;
      if (offline) {
        showCommerceToast("Для этого действия требуется интернет", "error");
        return;
      }

      setCartBusy(productId, true);
      try {
        let response: Record<string, unknown>;
        if (nextQuantity <= 0) {
          response = await removeCartItem(productId);
          applyAuthoritativeCartQuantity(response, productId, setCartQuantity, 0);
        } else {
          response = await updateCartQuantity(productId, nextQuantity);
          applyAuthoritativeCartQuantity(response, productId, setCartQuantity, nextQuantity);
        }
        await refreshTabBadges();
      } catch (err) {
        await reconcileCartQuantity(productId, setCartQuantity);
        if (handleCommerceAuthFailure(err)) {
          showCommerceToast("Войдите в аккаунт для этого действия", "error");
        } else {
          showCommerceToast(formatCommerceError(err), "error");
        }
        throw err;
      } finally {
        setCartBusy(productId, false);
      }
    },
    [offline, setCartBusy, setCartQuantity],
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
      if (useCommerceBusyStore.getState().isFavoriteBusy(productId)) return;
      if (offline) {
        showCommerceToast("Для этого действия требуется интернет", "error");
        return;
      }

      const wasFavorite = favoriteIds.has(productId);
      setFavorite(productId, !wasFavorite);
      setFavoriteBusy(productId, true);
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
        setFavoriteBusy(productId, false);
      }
    },
    [favoriteIds, offline, setFavorite, setFavoriteBusy],
  );

  return {
    isFavorite,
    isCartBusy,
    isFavoriteBusy,
    cartBusyProductIds,
    favoriteBusyProductIds,
    addProductToCart,
    incrementProductCart,
    decrementProductCart,
    toggleProductFavorite,
    favoritesHydrated: hydrated,
    cartHydrated,
  };
}
