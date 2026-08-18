import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { getCommerceUseCases } from "../../composition/commerce-container";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { productId } from "../../domain/contracts/value-objects/ids";
import type { SellerProductDetailView } from "./products/seller-products-view";
import { sellerProductDetailToView } from "./products/seller-products-view";

export function useSellerProductDetailData() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commerce = getCommerceUseCases();
  const [detail, setDetail] = useState<SellerProductDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError("Товар не найден");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await commerce.loadSellerProductDetail.execute({ productId: productId(id) });
    if (!result.ok) {
      setError(domainErrorMessage(result.error));
      setDetail(null);
    } else {
      setDetail(sellerProductDetailToView(result.value));
    }
    setLoading(false);
  }, [commerce.loadSellerProductDetail, id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return commerce.events.subscribe("SellerProductChanged", (event) => {
      if (String(event.productId) === id) void load();
    });
  }, [commerce.events, id, load]);

  return { detail, loading, error, refresh: load, productId: id ?? null };
}
