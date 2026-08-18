import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import type { MobileProductCardData } from "../../design-system/commerce/ProductCard";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { getCommerceUseCases } from "../../composition/commerce-container";
import { useAppStore } from "../../store/app-store";
import { sellerProductToCard } from "./seller-view";

export type SellerProductsDataState = {
  offline: boolean;
  sellerCapable: boolean;
  items: Array<MobileProductCardData & { status?: string }>;
  loading: boolean;
  error: string | null;
  query: string;
  setQuery: (value: string) => void;
  clearQuery: () => void;
  filtered: Array<MobileProductCardData & { status?: string }>;
  refresh: () => Promise<void>;
};

export function useSellerProductsData(): SellerProductsDataState {
  const commerce = getCommerceUseCases();
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);

  const [items, setItems] = useState<Array<MobileProductCardData & { status?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (offline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await commerce.loadSellerProducts.execute({});
    if (!result.ok) {
      setError(domainErrorMessage(result.error));
      setItems([]);
      setLoading(false);
      return;
    }
    setItems(result.value.items.map(sellerProductToCard));
    setLoading(false);
  }, [commerce.loadSellerProducts, offline]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = query
    ? items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
    : items;

  return {
    offline,
    sellerCapable,
    items,
    loading,
    error,
    query,
    setQuery,
    clearQuery: () => setQuery(""),
    filtered,
    refresh: load,
  };
}
