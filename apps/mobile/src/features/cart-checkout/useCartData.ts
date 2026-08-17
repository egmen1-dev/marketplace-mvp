import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchCart,
  fetchCatalog,
  fetchFavorites,
  fetchProduct,
  postTelemetry,
  removeCartItem,
  toggleFavorite,
  updateCartQuantity,
  type MobileProductListItem,
} from "../../api/endpoints";
import { useAppStore } from "../../store/app-store";
import {
  mergeProductEnrichment,
  parseCartCommerceView,
  recomputeCartTotals,
  type CartCommerceView,
  type CartLineView,
} from "./types";

export type CartDataState = {
  cart: CartCommerceView | null;
  recommendations: MobileProductListItem[];
  recommendationsFailed: boolean;
  favoriteIds: Set<string>;
  favoriteBusyId: string | null;
  loading: boolean;
  refreshing: boolean;
  offlineBlocked: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  onDecrement: (productId: string) => Promise<void>;
  onIncrement: (productId: string) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
  onToggleFavorite: (productId: string) => Promise<void>;
  onCheckout: () => void;
  retryRecommendations: () => Promise<void>;
};

export function useCartData(): CartDataState {
  const offline = useAppStore((s) => s.offline);
  const setBadges = useAppStore((s) => s.setBadges);
  const [cart, setCart] = useState<CartCommerceView | null>(null);
  const [recommendations, setRecommendations] = useState<MobileProductListItem[]>([]);
  const [recommendationsFailed, setRecommendationsFailed] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineBlocked, setOfflineBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewedRef = useRef(false);

  const syncBadge = useCallback(
    (nextCart: CartCommerceView | null) => {
      setBadges({ cart: nextCart?.itemCount ?? 0 });
    },
    [setBadges],
  );

  const enrichLines = useCallback(async (view: CartCommerceView): Promise<CartCommerceView> => {
    if (view.items.length === 0) return view;
    const enriched = await Promise.all(
      view.items.map(async (line) => {
        try {
          const raw = await fetchProduct(line.productId);
          return mergeProductEnrichment(line, raw);
        } catch {
          return line;
        }
      }),
    );
    const totals = recomputeCartTotals(enriched);
    return { ...view, items: enriched, ...totals };
  }, []);

  const loadRecommendations = useCallback(async (items: CartLineView[]) => {
    const categoryId = items.map((item) => item.categoryId).find(Boolean) ?? null;
    try {
      const res = await fetchCatalog({
        sort: "popular",
        categoryId: categoryId ?? undefined,
      });
      const cartIds = new Set(items.map((item) => item.productId));
      const filtered = res.items.filter((item) => !cartIds.has(item.id)).slice(0, 8);
      setRecommendations(filtered);
      setRecommendationsFailed(false);
    } catch {
      setRecommendations([]);
      setRecommendationsFailed(true);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const res = await fetchFavorites();
      setFavoriteIds(new Set(res.items.map((item) => item.id)));
    } catch {
      setFavoriteIds(new Set());
    }
  }, []);

  const loadCart = useCallback(
    async (isRefresh = false) => {
      if (offline) {
        setOfflineBlocked(true);
        setCart(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setOfflineBlocked(false);
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const raw = await fetchCart();
        let parsed = parseCartCommerceView(raw as unknown as Record<string, unknown>);
        parsed = await enrichLines(parsed);
        setCart(parsed);
        syncBadge(parsed);
        void loadRecommendations(parsed.items);
        void loadFavorites();

        if (!viewedRef.current) {
          viewedRef.current = true;
          void postTelemetry({ screen: "cart", event: "cart_viewed" });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить корзину");
        void postTelemetry({ screen: "cart", event: "cart_error", errorCode: "load_failed" });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enrichLines, loadFavorites, loadRecommendations, offline, syncBadge],
  );

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const patchLine = useCallback((productId: string, patch: Partial<CartLineView>) => {
    setCart((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((line) => (line.productId === productId ? { ...line, ...patch } : line));
      const totals = recomputeCartTotals(items);
      const next = { ...prev, items, ...totals };
      syncBadge(next);
      return next;
    });
  }, [syncBadge]);

  const onDecrement = useCallback(
    async (productId: string) => {
      const line = cart?.items.find((item) => item.productId === productId);
      if (!line || line.qtyBusy || offline) return;
      const nextQty = Math.max(1, line.quantity - 1);
      if (nextQty === line.quantity) return;

      patchLine(productId, {
        quantity: nextQty,
        lineTotal: line.price * nextQty,
        qtyBusy: true,
      });

      try {
        await updateCartQuantity(productId, nextQty);
        void postTelemetry({ screen: "cart", event: "cart_quantity_changed" });
        patchLine(productId, { qtyBusy: false });
      } catch (err) {
        patchLine(productId, {
          quantity: line.quantity,
          lineTotal: line.lineTotal,
          qtyBusy: false,
        });
        setError(err instanceof Error ? err.message : "Не удалось изменить количество");
        void postTelemetry({ screen: "cart", event: "cart_error", errorCode: "quantity_failed" });
      }
    },
    [cart?.items, offline, patchLine],
  );

  const onIncrement = useCallback(
    async (productId: string) => {
      const line = cart?.items.find((item) => item.productId === productId);
      if (!line || line.qtyBusy || offline) return;
      const maxQty = Math.max(line.stock, line.quantity);
      const nextQty = Math.min(maxQty, line.quantity + 1);
      if (nextQty === line.quantity) return;

      patchLine(productId, {
        quantity: nextQty,
        lineTotal: line.price * nextQty,
        qtyBusy: true,
      });

      try {
        await updateCartQuantity(productId, nextQty);
        void postTelemetry({ screen: "cart", event: "cart_quantity_changed" });
        patchLine(productId, { qtyBusy: false });
      } catch (err) {
        patchLine(productId, {
          quantity: line.quantity,
          lineTotal: line.lineTotal,
          qtyBusy: false,
        });
        setError(err instanceof Error ? err.message : "Не удалось изменить количество");
        void postTelemetry({ screen: "cart", event: "cart_error", errorCode: "quantity_failed" });
      }
    },
    [cart?.items, offline, patchLine],
  );

  const onRemove = useCallback(
    async (productId: string) => {
      if (offline) return;
      patchLine(productId, { removing: true });
      try {
        await removeCartItem(productId);
        setCart((prev) => {
          if (!prev) return prev;
          const items = prev.items.filter((line) => line.productId !== productId);
          const totals = recomputeCartTotals(items);
          const next = { ...prev, items, ...totals };
          syncBadge(next);
          return next;
        });
        void postTelemetry({ screen: "cart", event: "cart_item_removed" });
      } catch (err) {
        patchLine(productId, { removing: false });
        setError(err instanceof Error ? err.message : "Не удалось удалить товар");
        void postTelemetry({ screen: "cart", event: "cart_error", errorCode: "remove_failed" });
      }
    },
    [offline, patchLine, syncBadge],
  );

  const onToggleFavorite = useCallback(async (productId: string) => {
    setFavoriteBusyId(productId);
    try {
      const res = await toggleFavorite(productId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (res.isFavorite) next.add(productId);
        else next.delete(productId);
        return next;
      });
    } catch {
      setError("Не удалось обновить избранное");
    } finally {
      setFavoriteBusyId(null);
    }
  }, []);

  const onCheckout = useCallback(() => {
    if (!cart || cart.items.length === 0) return;
    void postTelemetry({ screen: "cart", event: "cart_checkout_started" });
  }, [cart]);

  return {
    cart,
    recommendations,
    recommendationsFailed,
    favoriteIds,
    favoriteBusyId,
    loading,
    refreshing,
    offlineBlocked,
    error,
    refresh: () => loadCart(true),
    onDecrement,
    onIncrement,
    onRemove,
    onToggleFavorite,
    onCheckout,
    retryRecommendations: async () => {
      if (cart) await loadRecommendations(cart.items);
    },
  };
}
