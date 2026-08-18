import { useCallback, useEffect, useRef, useState } from "react";

import type { SellerOrderSummary } from "../../domain/contracts/entities/seller";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { getCommerceUseCases } from "../../composition/commerce-container";
import { readSnapshot, saveSnapshot } from "../../storage/offline-cache";
import { useAppStore } from "../../store/app-store";
import { formatPrice } from "../../utils/format";
import { sellerOrderToSaleCard, type SellerSaleCardView } from "../seller/seller-view";

export type SellerSalesState = {
  offline: boolean;
  sellerCapable: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  fromCache: boolean;
  orders: SellerSaleCardView[];
  refresh: () => Promise<void>;
  onSaleOpened: (orderId: string) => void;
};

type SellerSalesSnapshot = { items: SellerOrderSummary[] };

export function useSellerSalesData(): SellerSalesState {
  const commerce = getCommerceUseCases();
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);

  const [orders, setOrders] = useState<SellerSaleCardView[]>(
    () =>
      readSnapshot<SellerSalesSnapshot>("seller-sales")?.payload.items.map(sellerOrderToSaleCard) ?? [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const openedRef = useRef(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
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

      const result = await commerce.loadSellerOrders.execute({});
      if (result.ok) {
        saveSnapshot("seller-sales", { items: result.value.items });
        setOrders(result.value.items.map(sellerOrderToSaleCard));
        if (!openedRef.current) {
          openedRef.current = true;
          commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_sales_opened" });
        }
      } else {
        const cached = readSnapshot<SellerSalesSnapshot>("seller-sales");
        if (cached?.payload.items.length) {
          setOrders(cached.payload.items.map(sellerOrderToSaleCard));
          setFromCache(true);
        } else {
          setOrders([]);
          setError(domainErrorMessage(result.error));
          commerce.trackScreenEvent({
            screen: "seller_sales",
            event: "seller_sales_error",
            errorCode: "load_failed",
          });
        }
      }

      setLoading(false);
      setRefreshing(false);
    },
    [commerce.loadSellerOrders, commerce.trackScreenEvent, offline, sellerCapable],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  useEffect(() => {
    return commerce.events.subscribe("SellerOrderChanged", () => {
      void load("refresh");
    });
  }, [commerce.events, load]);

  useEffect(() => {
    return commerce.events.subscribe("SellerProductChanged", () => {
      void load("refresh");
    });
  }, [commerce.events, load]);

  const onSaleOpened = useCallback(
    (orderId: string) => {
      commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_sale_opened", errorCode: orderId });
    },
    [commerce.trackScreenEvent],
  );

  return {
    offline,
    sellerCapable,
    loading,
    refreshing,
    error,
    fromCache,
    orders,
    refresh: () => load("refresh"),
    onSaleOpened,
  };
}

export function formatSellerSaleAmount(order: SellerSaleCardView): string {
  return formatPrice(order.sellerSubtotal, order.currency);
}
