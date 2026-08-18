import { useCallback, useEffect, useRef, useState } from "react";

import { fetchSellerOrders, postTelemetry } from "../../api/endpoints";
import { readSnapshot, saveSnapshot } from "../../storage/offline-cache";
import { useAppStore } from "../../store/app-store";
import { formatPrice } from "../../utils/format";
import { mapSellerOrderItem, type SellerSaleCardView } from "./types";

export type SellerSalesState = {
  offline: boolean;
  sellerCapable: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  fromCache: boolean;
  orders: SellerSaleCardView[];
  refresh: () => Promise<void>;
};

export function useSellerSalesData(): SellerSalesState {
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const [orders, setOrders] = useState<SellerSaleCardView[]>(
    () => readSnapshot<{ items: Parameters<typeof mapSellerOrderItem>[0][] }>("seller-sales")?.payload.items.map(mapSellerOrderItem) ?? [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const openedRef = useRef(false);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!sellerCapable) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (offline) {
      setFromCache(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    setError(null);
    setFromCache(false);

    try {
      const res = await fetchSellerOrders();
      saveSnapshot("seller-sales", res);
      setOrders(res.items.map(mapSellerOrderItem));
      if (!openedRef.current) {
        openedRef.current = true;
        void postTelemetry({ screen: "seller_sales", event: "seller_sales_opened" });
      }
    } catch (err) {
      const cached = readSnapshot<{ items: Parameters<typeof mapSellerOrderItem>[0][] }>("seller-sales");
      if (cached?.payload.items.length) {
        setOrders(cached.payload.items.map(mapSellerOrderItem));
        setFromCache(true);
      } else {
        setOrders([]);
        setError(err instanceof Error ? err.message : "Не удалось загрузить продажи");
        void postTelemetry({ screen: "seller_sales", event: "seller_sales_error", errorCode: "load_failed" });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [offline, sellerCapable, openedRef]);

  useEffect(() => {
    void load("initial");
  }, [load]);

  return {
    offline,
    sellerCapable,
    loading,
    refreshing,
    error,
    fromCache,
    orders,
    refresh: () => load("refresh"),
  };
}

export function formatSellerSaleAmount(order: SellerSaleCardView): string {
  return formatPrice(order.sellerSubtotal, order.currency);
}
