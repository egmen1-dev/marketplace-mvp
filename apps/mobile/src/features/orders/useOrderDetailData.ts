import * as Linking from "expo-linking";
import { useCallback, useEffect, useRef, useState } from "react";
import { Share } from "react-native";

import type { OrderDetail } from "../../domain/contracts/entities/order";
import { orderId, productId } from "../../domain/contracts/value-objects/ids";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { getCommerceUseCases } from "../../domain/services/commerce-container";
import { loadAppConfig } from "../../config/env";
import { cacheOrderDetail, loadCachedOrderDetail } from "../../storage/order-cache";
import { useAppStore } from "../../store/app-store";
import { mergeSellerNameInView, orderDetailToView } from "./order-view";
import { parseOrderDetail, type OrderDetailView } from "./types";

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

const STATUS_TO_API: Record<OrderDetail["status"], string> = {
  pending: "NEW",
  paid: "PAID",
  processing: "PROCESSING",
  shipped: "SHIPPED",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
};

function orderDetailToCacheRaw(order: OrderDetail): Record<string, unknown> {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: STATUS_TO_API[order.status],
    total: order.total.amount,
    currency: order.total.currency,
    subtotal: order.total.amount,
    shippingCost: 0,
    createdAt: order.createdAt,
    items: order.lines.map((line, index) => ({
      id: `${order.id}-${index}`,
      productId: line.productId,
      productName: line.title,
      quantity: line.quantity,
      unitPrice: line.price.amount,
      totalPrice: line.price.amount * line.quantity,
      primaryImage: line.imageUrl ? { url: line.imageUrl } : null,
    })),
    history: order.timeline.map((step) => ({
      id: step.id,
      status: STATUS_TO_API[order.status],
      createdAt: order.createdAt,
      label: step.label,
    })),
  };
}

async function enrichSeller(
  commerce: ReturnType<typeof getCommerceUseCases>,
  detail: OrderDetailView,
): Promise<OrderDetailView> {
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

export function useOrderDetailData(orderIdParam: string | undefined): OrderDetailState {
  const commerce = getCommerceUseCases();
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
    if (!orderIdParam) {
      setLoading(false);
      setOrder(null);
      return;
    }

    setLoading(true);
    setError(null);
    setFromCache(false);
    setOfflineBlocked(false);

    if (offline) {
      const cached = await loadCachedOrderDetail(orderIdParam);
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
      const result = await commerce.loadOrderDetail.execute({ orderId: orderId(orderIdParam) });
      if (!result.ok) throw new Error(domainErrorMessage(result.error));

      let parsed = orderDetailToView(result.value);
      parsed = await enrichSeller(commerce, parsed);
      setOrder(parsed);
      await cacheOrderDetail(orderIdParam, orderDetailToCacheRaw(result.value));

      if (!openedRef.current) {
        openedRef.current = true;
        commerce.trackScreenEvent({ screen: "purchase", event: "order_opened" });
        commerce.trackScreenEvent({ screen: "purchase", event: "order_timeline_opened" });
      }
    } catch (err) {
      const cached = await loadCachedOrderDetail(orderIdParam);
      if (cached) {
        setOrder(parseOrderDetail(cached));
        setFromCache(true);
      } else {
        setOrder(null);
        setError(err instanceof Error ? err.message : "Не удалось загрузить заказ");
        commerce.trackScreenEvent({ screen: "purchase", event: "orders_retry", errorCode: "detail_failed" });
      }
    } finally {
      setLoading(false);
    }
  }, [commerce.loadOrderDetail, commerce.trackScreenEvent, offline, orderIdParam]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const onShare = useCallback(async () => {
    if (!order) return;
    try {
      const result = await commerce.shareOrder.execute({ orderId: orderId(order.id) });
      if (!result.ok) throw new Error(domainErrorMessage(result.error));
      await Share.share({
        message: result.value.message,
        url: result.value.uri,
      });
      commerce.trackScreenEvent({ screen: "purchase", event: "order_shared" });
    } catch {
      // user dismissed share sheet
    }
  }, [commerce.shareOrder, commerce.trackScreenEvent, order]);

  const onReorder = useCallback(async () => {
    if (!order || order.items.length === 0) return;
    setReorderBusy(true);
    setReorderMessage(null);
    try {
      const items = order.items
        .filter((item) => item.productId)
        .map((item) => ({ productId: productId(item.productId), quantity: item.quantity }));
      const result = await commerce.reorderItems.execute({ items });
      if (!result.ok) throw new Error(domainErrorMessage(result.error));
      setReorderMessage("Товары добавлены в корзину");
      commerce.trackScreenEvent({ screen: "purchase", event: "order_reordered" });
    } catch (err) {
      setReorderMessage(err instanceof Error ? err.message : "Не удалось повторить заказ");
    } finally {
      setReorderBusy(false);
    }
  }, [commerce.reorderItems, commerce.trackScreenEvent, order]);

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
