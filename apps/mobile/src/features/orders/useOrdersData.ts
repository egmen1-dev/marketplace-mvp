import { useCallback, useEffect, useRef, useState } from "react";

import { fetchCatalog, fetchOrderDetail, fetchOrders, fetchProduct, postTelemetry, toggleFavorite } from "../../api/endpoints";
import type { MobileProductCardData } from "../../design-system/commerce/ProductCard";
import { cacheOrdersList, loadCachedOrdersList } from "../../storage/order-cache";
import { useAppStore } from "../../store/app-store";
import {
  mergeOrderPreview,
  parseOrderDetail,
  parseOrderListItem,
  mergeSellerName,
  type OrderListCardView,
} from "./types";

export type OrdersDataState = {
  activeOrders: OrderListCardView[];
  completedOrders: OrderListCardView[];
  activeCount: number;
  completedCount: number;
  recommendations: MobileProductCardData[];
  recommendationsFailed: boolean;
  loading: boolean;
  refreshing: boolean;
  fromCache: boolean;
  offlineBlocked: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  retryRecommendations: () => Promise<void>;
  onToggleFavorite: (productId: string) => Promise<void>;
};

async function enrichSeller(detail: ReturnType<typeof parseOrderDetail>): Promise<ReturnType<typeof parseOrderDetail>> {
  const first = detail.items[0];
  if (!first?.productId) return detail;
  try {
    const raw = await fetchProduct(first.productId);
    const seller = raw.seller as { storeName?: string } | null | undefined;
    const name = typeof seller?.storeName === "string" ? seller.storeName : null;
    return mergeSellerName(detail, name);
  } catch {
    return detail;
  }
}

export function useOrdersData(): OrdersDataState {
  const offline = useAppStore((s) => s.offline);
  const [activeOrders, setActiveOrders] = useState<OrderListCardView[]>([]);
  const [completedOrders, setCompletedOrders] = useState<OrderListCardView[]>([]);
  const [recommendations, setRecommendations] = useState<MobileProductCardData[]>([]);
  const [recommendationsFailed, setRecommendationsFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [offlineBlocked, setOfflineBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedRef = useRef(false);

  const loadRecommendations = useCallback(async () => {
    try {
      const res = await fetchCatalog({ sort: "popular" });
      setRecommendations(res.items.slice(0, 8));
      setRecommendationsFailed(false);
    } catch {
      setRecommendations([]);
      setRecommendationsFailed(true);
    }
  }, []);

  const enrichPreviews = useCallback(async (cards: OrderListCardView[]): Promise<OrderListCardView[]> => {
    const targets = cards.filter((card) => card.isActive).slice(0, 8);
    const enriched = await Promise.all(
      targets.map(async (card) => {
        try {
          const raw = await fetchOrderDetail(card.id);
          let detail = parseOrderDetail(raw);
          detail = await enrichSeller(detail);
          return mergeOrderPreview(card, detail);
        } catch {
          return card;
        }
      }),
    );
    const map = new Map(enriched.map((card) => [card.id, card]));
    return cards.map((card) => map.get(card.id) ?? card);
  }, []);

  const applyOrders = useCallback(
    async (items: Record<string, unknown>[], cached: boolean) => {
      const parsed = items.map((item) => parseOrderListItem(item));
      const withPreviews = await enrichPreviews(parsed);
      setActiveOrders(withPreviews.filter((item) => item.isActive));
      setCompletedOrders(withPreviews.filter((item) => !item.isActive));
      setFromCache(cached);
      if (parsed.length === 0 && !cached) {
        void postTelemetry({ screen: "purchase", event: "orders_empty" });
      }
    },
    [enrichPreviews],
  );

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (offline) {
        const cached = await loadCachedOrdersList();
        if (cached && cached.length > 0) {
          await applyOrders(cached, true);
          setOfflineBlocked(false);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        setOfflineBlocked(true);
        setActiveOrders([]);
        setCompletedOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setOfflineBlocked(false);
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetchOrders();
        await cacheOrdersList(res.items);
        await applyOrders(res.items, false);
        void loadRecommendations();
        if (!openedRef.current) {
          openedRef.current = true;
          void postTelemetry({ screen: "purchase", event: "order_list_opened" });
        }
      } catch (err) {
        const cached = await loadCachedOrdersList();
        if (cached && cached.length > 0) {
          await applyOrders(cached, true);
        } else {
          setError(err instanceof Error ? err.message : "Не удалось загрузить заказы");
          void postTelemetry({ screen: "purchase", event: "orders_retry", errorCode: "load_failed" });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyOrders, loadRecommendations, offline],
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const onToggleFavorite = useCallback(async (productId: string) => {
    await toggleFavorite(productId);
  }, []);

  return {
    activeOrders,
    completedOrders,
    activeCount: activeOrders.length,
    completedCount: completedOrders.length,
    recommendations,
    recommendationsFailed,
    loading,
    refreshing,
    fromCache,
    offlineBlocked,
    error,
    refresh: () => loadOrders(true),
    retryRecommendations: loadRecommendations,
    onToggleFavorite,
  };
}
