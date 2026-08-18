import { useCallback, useEffect, useRef, useState } from "react";

import type { MobileProductCardData } from "../../design-system/commerce/ProductCard";
import type { OrderDetail, OrderSummary } from "../../domain/contracts/entities/order";
import { orderId, productId } from "../../domain/contracts/value-objects/ids";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { getCommerceUseCases } from "../../domain/services/commerce-container";
import { productSummariesToCardViews } from "../commerce/product-view";
import { cacheOrdersList, loadCachedOrdersList } from "../../storage/order-cache";
import { useAppStore } from "../../store/app-store";
import {
  mergeOrderPreview,
  parseOrderListItem,
  type OrderListCardView,
} from "./types";
import {
  mergeSellerNameInView,
  orderDetailToView,
  orderSummaryToListCard,
} from "./order-view";

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
  onToggleFavoriteRecommendation: (productId: string) => Promise<void>;
};

const STATUS_TO_API: Record<OrderSummary["status"], string> = {
  pending: "NEW",
  paid: "PAID",
  processing: "PROCESSING",
  shipped: "SHIPPED",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
};

function orderSummaryToCacheRaw(order: OrderSummary): Record<string, unknown> {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: STATUS_TO_API[order.status],
    total: order.total.amount,
    currency: order.total.currency,
    itemCount: order.itemCount,
    createdAt: order.createdAt,
  };
}

async function enrichSellerName(
  commerce: ReturnType<typeof getCommerceUseCases>,
  detail: ReturnType<typeof orderDetailToView>,
): Promise<ReturnType<typeof orderDetailToView>> {
  const first = detail.items[0];
  if (!first?.productId) return detail;
  try {
    const result = await commerce.loadProduct.execute({ productId: productId(first.productId) });
    if (!result.ok) return detail;
    const name = result.value.sellerName;
    return mergeSellerNameInView(detail, typeof name === "string" ? name : null);
  } catch {
    return detail;
  }
}

export function useOrdersData(): OrdersDataState {
  const commerce = getCommerceUseCases();
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
      const result = await commerce.loadCatalog.execute({ sort: "popular" });
      if (!result.ok) throw new Error(domainErrorMessage(result.error));
      setRecommendations(productSummariesToCardViews(result.value.items).slice(0, 8));
      setRecommendationsFailed(false);
    } catch {
      setRecommendations([]);
      setRecommendationsFailed(true);
    }
  }, [commerce.loadCatalog]);

  const enrichPreviews = useCallback(
    async (cards: OrderListCardView[]): Promise<OrderListCardView[]> => {
      const targets = cards.filter((card) => card.isActive).slice(0, 8);
      const enriched = await Promise.all(
        targets.map(async (card) => {
          try {
            const result = await commerce.loadOrderDetail.execute({ orderId: orderId(card.id) });
            if (!result.ok) return card;
            let detail = orderDetailToView(result.value);
            detail = await enrichSellerName(commerce, detail);
            return mergeOrderPreview(card, detail);
          } catch {
            return card;
          }
        }),
      );
      const map = new Map(enriched.map((card) => [card.id, card]));
      return cards.map((card) => map.get(card.id) ?? card);
    },
    [commerce.loadOrderDetail],
  );

  const applyOrders = useCallback(
    async (items: Record<string, unknown>[], cached: boolean) => {
      const parsed = items.map((item) => parseOrderListItem(item));
      const withPreviews = await enrichPreviews(parsed);
      setActiveOrders(withPreviews.filter((item) => item.isActive));
      setCompletedOrders(withPreviews.filter((item) => !item.isActive));
      setFromCache(cached);
      if (parsed.length === 0 && !cached) {
        commerce.trackScreenEvent({ screen: "purchase", event: "orders_empty" });
      }
    },
    [commerce.trackScreenEvent, enrichPreviews],
  );

  const applyDomainOrders = useCallback(
    async (summaries: ReadonlyArray<OrderSummary>, cached: boolean) => {
      const cards = summaries.map(orderSummaryToListCard);
      const withPreviews = await enrichPreviews(cards);
      setActiveOrders(withPreviews.filter((item) => item.isActive));
      setCompletedOrders(withPreviews.filter((item) => !item.isActive));
      setFromCache(cached);
      if (summaries.length === 0 && !cached) {
        commerce.trackScreenEvent({ screen: "purchase", event: "orders_empty" });
      }
    },
    [commerce.trackScreenEvent, enrichPreviews],
  );

  const refreshOrders = useCallback(
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
        const result = await commerce.loadOrders.execute({});
        if (!result.ok) throw new Error(domainErrorMessage(result.error));
        await cacheOrdersList(result.value.map(orderSummaryToCacheRaw));
        await applyDomainOrders(result.value, false);
        void loadRecommendations();
        if (!openedRef.current) {
          openedRef.current = true;
          commerce.trackScreenEvent({ screen: "purchase", event: "order_list_opened" });
        }
      } catch (err) {
        const cached = await loadCachedOrdersList();
        if (cached && cached.length > 0) {
          await applyOrders(cached, true);
        } else {
          setError(err instanceof Error ? err.message : "Не удалось загрузить заказы");
          commerce.trackScreenEvent({ screen: "purchase", event: "orders_retry", errorCode: "load_failed" });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyDomainOrders, applyOrders, commerce.loadOrders, commerce.trackScreenEvent, loadRecommendations, offline],
  );

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  const onToggleFavoriteRecommendation = useCallback(
    async (recommendationProductId: string) => {
      const result = await commerce.toggleFavorite.execute({ productId: productId(recommendationProductId) });
      if (!result.ok) {
        setError(domainErrorMessage(result.error));
      }
    },
    [commerce.toggleFavorite],
  );

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
    refresh: () => refreshOrders(true),
    retryRecommendations: loadRecommendations,
    onToggleFavoriteRecommendation,
  };
}
