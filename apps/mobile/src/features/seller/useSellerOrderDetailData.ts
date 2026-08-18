import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { getCommerceUseCases } from "../../composition/commerce-container";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { orderId } from "../../domain/contracts/value-objects/ids";
import type { SellerOrderDetailView } from "./orders/seller-orders-view";
import { sellerOrderDetailToView } from "./orders/seller-orders-view";

export function useSellerOrderDetailData() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commerce = getCommerceUseCases();
  const [detail, setDetail] = useState<SellerOrderDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError("Заказ не найден");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await commerce.loadSellerOrderDetail.execute({ orderId: orderId(id) });
    if (!result.ok) {
      setError(domainErrorMessage(result.error));
      setDetail(null);
    } else {
      setDetail(sellerOrderDetailToView(result.value));
    }
    setLoading(false);
  }, [commerce.loadSellerOrderDetail, id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return commerce.events.subscribe("SellerOrderChanged", (event) => {
      if (String(event.order.id) === id) void load();
    });
  }, [commerce.events, id, load]);

  return { detail, loading, error, refresh: load, orderId: id ?? null };
}
