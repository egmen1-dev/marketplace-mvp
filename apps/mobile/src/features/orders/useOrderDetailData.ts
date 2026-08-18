import * as Linking from "expo-linking";
import { useCallback, useEffect, useRef, useState } from "react";
import { Share } from "react-native";

import { addToCart, fetchOrderDetail, fetchProduct, postTelemetry } from "../../api/endpoints";
import { loadAppConfig } from "../../config/env";
import { cacheOrderDetail, loadCachedOrderDetail } from "../../storage/order-cache";
import { useAppStore } from "../../store/app-store";
import { mergeSellerName, parseOrderDetail, type OrderDetailView } from "./types";

export type OrderDetailState = {
  order: OrderDetailView | null;
  loading: boolean;
  fromCache: boolean;
  offlineBlocked: boolean;
  error: string | null;
  reorderBusy: boolean;
  reorderMessage: string | null;
  refresh: () => Promise<void>;
  onShare: () => Promise<void>;
  onReorder: () => Promise<void>;
  onOpenWeb: () => void;
};

async function enrichSeller(detail: OrderDetailView): Promise<OrderDetailView> {
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

export function useOrderDetailData(orderId: string | undefined): OrderDetailState {
  const offline = useAppStore((s) => s.offline);
  const [order, setOrder] = useState<OrderDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [offlineBlocked, setOfflineBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [reorderMessage, setReorderMessage] = useState<string | null>(null);
  const openedRef = useRef(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setOrder(null);
      return;
    }

    setLoading(true);
    setError(null);
    setFromCache(false);
    setOfflineBlocked(false);

    if (offline) {
      const cached = await loadCachedOrderDetail(orderId);
      if (cached) {
        setOrder(parseOrderDetail(cached));
        setFromCache(true);
        setLoading(false);
        return;
      }
      setOfflineBlocked(true);
      setOrder(null);
      setLoading(false);
      return;
    }

    try {
      const raw = await fetchOrderDetail(orderId);
      let parsed = parseOrderDetail(raw);
      parsed = await enrichSeller(parsed);
      setOrder(parsed);
      await cacheOrderDetail(orderId, raw);
      if (!openedRef.current) {
        openedRef.current = true;
        void postTelemetry({ screen: "purchase", event: "order_opened" });
        void postTelemetry({ screen: "purchase", event: "order_timeline_opened" });
      }
    } catch (err) {
      const cached = await loadCachedOrderDetail(orderId);
      if (cached) {
        setOrder(parseOrderDetail(cached));
        setFromCache(true);
      } else {
        setOrder(null);
        setError(err instanceof Error ? err.message : "Не удалось загрузить заказ");
        void postTelemetry({ screen: "purchase", event: "orders_retry", errorCode: "detail_failed" });
      }
    } finally {
      setLoading(false);
    }
  }, [offline, openedRef, orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const onShare = useCallback(async () => {
    if (!order) return;
    const url = `lot://order/${order.id}`;
    try {
      await Share.share({
        message: `Заказ ${order.orderNumber} в LOT — ${url}`,
        url,
      });
      void postTelemetry({ screen: "purchase", event: "order_shared" });
    } catch {
      // user dismissed share sheet
    }
  }, [order]);

  const onReorder = useCallback(async () => {
    if (!order || order.items.length === 0) return;
    setReorderBusy(true);
    setReorderMessage(null);
    try {
      for (const item of order.items) {
        if (item.productId) {
          await addToCart(item.productId, item.quantity);
        }
      }
      setReorderMessage("Товары добавлены в корзину");
      void postTelemetry({ screen: "purchase", event: "order_reordered" });
    } catch (err) {
      setReorderMessage(err instanceof Error ? err.message : "Не удалось повторить заказ");
    } finally {
      setReorderBusy(false);
    }
  }, [order]);

  const onOpenWeb = useCallback(() => {
    if (!order) return;
    const config = loadAppConfig();
    void Linking.openURL(`${config.apiBaseUrl}/orders/${order.id}`);
  }, [order]);

  return {
    order,
    loading,
    fromCache,
    offlineBlocked,
    error,
    reorderBusy,
    reorderMessage,
    refresh: loadOrder,
    onShare,
    onReorder,
    onOpenWeb,
  };
}
