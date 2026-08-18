import { useCallback, useEffect, useRef, useState } from "react";

import type { MobileProductCardData } from "../../design-system/commerce/ProductCard";
import { getCommerceUseCases } from "../../domain/services/commerce-container";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { productId } from "../../domain/contracts/value-objects/ids";
import { productSummariesToCardViews } from "../commerce/product-view";
import { cartToCommerceView } from "../commerce/cart-view";
import { useAppStore } from "../../store/app-store";
import { getRestCommerceTransport } from "../../infrastructure/transport/rest-commerce-transport";
import {
  mergeProductEnrichment,
  recomputeCartTotals,
  type CartCommerceView,
  type CartLineView,
} from "./types";

export type CartDataState = {
  cart: CartCommerceView | null;
  recommendations: MobileProductCardData[];
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
  const commerce = getCommerceUseCases();
  const transport = getRestCommerceTransport();
  const offline = useAppStore((s) => s.offline);
  const setBadges = useAppStore((s) => s.setBadges);
  const [cart, setCart] = useState<CartCommerceView | null>(null);
  const [recommendations, setRecommendations] = useState<MobileProductCardData[]>([]);
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

  useEffect(() => {
    const unsubCart = commerce.events.subscribe("CartUpdated", (event) => {
      syncBadge(cartToCommerceView(event.cart));
    });
    const unsubFav = commerce.events.subscribe("FavoriteChanged", (event) => {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (event.isFavorite) next.add(event.productId);
        else next.delete(event.productId);
        return next;
      });
      if (event.favoritesCount != null) setBadges({ favorites: event.favoritesCount });
    });
    return () => {
      unsubCart();
      unsubFav();
    };
  }, [commerce.events, setBadges, syncBadge]);

  const enrichLines = useCallback(async (view: CartCommerceView): Promise<CartCommerceView> => {
    if (view.items.length === 0) return view;
    const enriched = await Promise.all(
      view.items.map(async (line) => {
        try {
          const raw = await transport.request<Record<string, unknown>>({
            path: `/api/products/${encodeURIComponent(line.productId)}`,
          });
          return mergeProductEnrichment(line, raw);
        } catch {
          return line;
        }
      }),
    );
    const totals = recomputeCartTotals(enriched);
    return { ...view, items: enriched, ...totals };
  }, [transport]);

  const loadRecommendations = useCallback(
    async (items: CartLineView[]) => {
      const categoryId = items.map((item) => item.categoryId).find(Boolean) ?? null;
      try {
        const result = await commerce.loadCatalog.execute({
          sort: "popular",
          categoryId: categoryId
            ? (categoryId as import("../../domain/contracts/value-objects/ids").CategoryId)
            : undefined,
        });
        if (!result.ok) throw new Error(domainErrorMessage(result.error));
        const cartIds = new Set(items.map((item) => item.productId));
        const filtered = productSummariesToCardViews(result.value.items)
          .filter((item) => !cartIds.has(item.id))
          .slice(0, 8);
        setRecommendations(filtered);
        setRecommendationsFailed(false);
      } catch {
        setRecommendations([]);
        setRecommendationsFailed(true);
      }
    },
    [commerce.loadCatalog],
  );

  const loadFavorites = useCallback(async () => {
    const result = await commerce.loadFavorites.execute({});
    if (!result.ok) {
      setFavoriteIds(new Set());
      return;
    }
    setFavoriteIds(new Set(result.value.items.map((item) => item.id)));
    setBadges({ favorites: result.value.items.length });
  }, [commerce.loadFavorites, setBadges]);

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
        const result = await commerce.loadCart.execute({});
        if (!result.ok) throw new Error(domainErrorMessage(result.error));
        let parsed = cartToCommerceView(result.value);
        parsed = await enrichLines(parsed);
        setCart(parsed);
        syncBadge(parsed);
        void loadRecommendations(parsed.items);
        void loadFavorites();

        if (!viewedRef.current) {
          viewedRef.current = true;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить корзину");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enrichLines, loadFavorites, loadRecommendations, offline, syncBadge, commerce.loadCart],
  );

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const patchLine = useCallback(
    (lineProductId: string, patch: Partial<CartLineView>) => {
      setCart((prev) => {
        if (!prev) return prev;
        const items = prev.items.map((line) => (line.productId === lineProductId ? { ...line, ...patch } : line));
        const totals = recomputeCartTotals(items);
        const next = { ...prev, items, ...totals };
        syncBadge(next);
        return next;
      });
    },
    [syncBadge],
  );

  const onDecrement = useCallback(
    async (lineProductId: string) => {
      const line = cart?.items.find((item) => item.productId === lineProductId);
      if (!line || line.qtyBusy || offline) return;
      const nextQty = Math.max(1, line.quantity - 1);
      if (nextQty === line.quantity) return;

      patchLine(lineProductId, {
        quantity: nextQty,
        lineTotal: line.price * nextQty,
        qtyBusy: true,
      });

      try {
        const result = await commerce.updateCartQuantity.execute({
          productId: productId(lineProductId),
          quantity: nextQty,
        });
        if (!result.ok) throw new Error(domainErrorMessage(result.error));
        patchLine(lineProductId, { qtyBusy: false });
      } catch (err) {
        patchLine(lineProductId, {
          quantity: line.quantity,
          lineTotal: line.lineTotal,
          qtyBusy: false,
        });
        setError(err instanceof Error ? err.message : "Не удалось изменить количество");
      }
    },
    [cart?.items, offline, patchLine, commerce.updateCartQuantity],
  );

  const onIncrement = useCallback(
    async (lineProductId: string) => {
      const line = cart?.items.find((item) => item.productId === lineProductId);
      if (!line || line.qtyBusy || offline) return;
      const maxQty = Math.max(line.stock, line.quantity);
      const nextQty = Math.min(maxQty, line.quantity + 1);
      if (nextQty === line.quantity) return;

      patchLine(lineProductId, {
        quantity: nextQty,
        lineTotal: line.price * nextQty,
        qtyBusy: true,
      });

      try {
        const result = await commerce.updateCartQuantity.execute({
          productId: productId(lineProductId),
          quantity: nextQty,
        });
        if (!result.ok) throw new Error(domainErrorMessage(result.error));
        patchLine(lineProductId, { qtyBusy: false });
      } catch (err) {
        patchLine(lineProductId, {
          quantity: line.quantity,
          lineTotal: line.lineTotal,
          qtyBusy: false,
        });
        setError(err instanceof Error ? err.message : "Не удалось изменить количество");
      }
    },
    [cart?.items, offline, patchLine, commerce.updateCartQuantity],
  );

  const onRemove = useCallback(
    async (lineProductId: string) => {
      if (offline) return;
      patchLine(lineProductId, { removing: true });
      try {
        const result = await commerce.removeFromCart.execute({ productId: productId(lineProductId) });
        if (!result.ok) throw new Error(domainErrorMessage(result.error));
        const parsed = cartToCommerceView(result.value);
        setCart((prev) => {
          if (!prev) return prev;
          const items = prev.items.filter((line) => line.productId !== lineProductId);
          const totals = recomputeCartTotals(items);
          const next = { ...prev, items, ...totals };
          syncBadge(next);
          return next;
        });
        void enrichLines(parsed);
      } catch (err) {
        patchLine(lineProductId, { removing: false });
        setError(err instanceof Error ? err.message : "Не удалось удалить товар");
      }
    },
    [offline, patchLine, syncBadge, commerce.removeFromCart, enrichLines],
  );

  const onToggleFavorite = useCallback(
    async (lineProductId: string) => {
      setFavoriteBusyId(lineProductId);
      try {
        const result = await commerce.toggleFavorite.execute({ productId: productId(lineProductId) });
        if (!result.ok) throw new Error(domainErrorMessage(result.error));
      } catch {
        setError("Не удалось обновить избранное");
      } finally {
        setFavoriteBusyId(null);
      }
    },
    [commerce.toggleFavorite],
  );

  const onCheckout = useCallback(() => {
    if (!cart || cart.items.length === 0) return;
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
