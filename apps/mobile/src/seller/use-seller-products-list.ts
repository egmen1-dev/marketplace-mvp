import { useCallback, useEffect, useRef, useState } from "react";

import { fetchSellerProducts, type MobileProductListItem } from "../api/endpoints";

export type SellerProductsTab = "active" | "pending" | "drafts" | "sold";

export function useSellerProductsList(tab: SellerProductsTab, offline: boolean) {
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const requestSeq = useRef(0);

  const load = useCallback(
    async (effectiveTab: SellerProductsTab, effectiveQuery: string) => {
      if (offline) {
        setLoading(false);
        return;
      }

      const requestId = ++requestSeq.current;
      setLoading(true);
      setError(null);

      try {
        const res = await fetchSellerProducts({
          tab: effectiveTab,
          q: effectiveQuery || undefined,
        });
        if (requestId !== requestSeq.current) return;
        setItems(res.items);
      } catch (err) {
        if (requestId !== requestSeq.current) return;
        setError(err instanceof Error ? err.message : "Не удалось загрузить ЛОТы");
      } finally {
        if (requestId === requestSeq.current) setLoading(false);
      }
    },
    [offline],
  );

  useEffect(() => {
    setQuery("");
  }, [tab]);

  useEffect(() => {
    requestSeq.current += 1;
    setItems([]);
    const trimmed = query.trim();
    const delay = trimmed ? 300 : 0;
    const handle = setTimeout(() => {
      void load(tab, trimmed);
    }, delay);
    return () => clearTimeout(handle);
  }, [tab, query, load]);

  const refresh = useCallback(() => {
    void load(tab, query.trim());
  }, [load, query, tab]);

  return {
    items,
    loading,
    error,
    query,
    setQuery,
    refresh,
  };
}
