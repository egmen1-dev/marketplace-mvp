import { useCallback, useEffect, useRef, useState } from "react";

import { fetchCatalog, fetchCategories, type MobileProductListItem } from "../../api/endpoints";
import { loadRecentViews } from "../../storage/recent-views";
import { discountPercent } from "../../utils/format";
import { useAppStore } from "../../store/app-store";

export type CategoryItem = { id: string; name: string; slug?: string };

export type SectionLoadState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

function emptySection<T>(data: T): SectionLoadState<T> {
  return { data, loading: true, error: null };
}

export function useBuyerHomeData() {
  const offline = useAppStore((s) => s.offline);
  const loadingRef = useRef(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<SectionLoadState<CategoryItem[]>>(emptySection([]));
  const [recommended, setRecommended] = useState<SectionLoadState<MobileProductListItem[]>>(emptySection([]));
  const [popular, setPopular] = useState<SectionLoadState<MobileProductListItem[]>>(emptySection([]));
  const [newest, setNewest] = useState<SectionLoadState<MobileProductListItem[]>>(emptySection([]));
  const [deals, setDeals] = useState<SectionLoadState<MobileProductListItem[]>>(emptySection([]));
  const [recent, setRecent] = useState<SectionLoadState<MobileProductListItem[]>>(emptySection([]));

  const loadCategories = useCallback(async () => {
    if (offline) {
      setCategories((s) => ({ ...s, loading: false }));
      return;
    }
    setCategories((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetchCategories();
      setCategories({ data: res.items.slice(0, 12), loading: false, error: null });
    } catch (err) {
      setCategories((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Ошибка категорий",
      }));
    }
  }, [offline]);

  const loadPopular = useCallback(async () => {
    if (offline) {
      setPopular((s) => ({ ...s, loading: false }));
      setRecommended((s) => ({ ...s, loading: false }));
      setDeals((s) => ({ ...s, loading: false }));
      return;
    }
    setPopular((s) => ({ ...s, loading: true, error: null }));
    setRecommended((s) => ({ ...s, loading: true, error: null }));
    setDeals((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetchCatalog({ sort: "popular" });
      const items = res.items;
      setPopular({ data: items.slice(0, 8), loading: false, error: null });
      setRecommended({ data: items.slice(0, 6), loading: false, error: null });
      const promo = items.filter((p: MobileProductListItem) => (discountPercent(p.price, p.compareAt) ?? 0) > 0).slice(0, 6);
      setDeals({ data: promo, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка загрузки";
      setPopular((s) => ({ ...s, loading: false, error: message }));
      setRecommended((s) => ({ ...s, loading: false, error: message }));
      setDeals((s) => ({ ...s, loading: false, error: message }));
    }
  }, [offline]);

  const loadNewest = useCallback(async () => {
    if (offline) {
      setNewest((s) => ({ ...s, loading: false }));
      return;
    }
    setNewest((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetchCatalog({ sort: "newest" });
      setNewest({ data: res.items.slice(0, 8), loading: false, error: null });
    } catch (err) {
      setNewest((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Ошибка новинок",
      }));
    }
  }, [offline]);

  const loadRecent = useCallback(async () => {
    setRecent((s) => ({ ...s, loading: true, error: null }));
    try {
      const views = await loadRecentViews();
      setRecent({ data: views as MobileProductListItem[], loading: false, error: null });
    } catch {
      setRecent({ data: [], loading: false, error: null });
    }
  }, []);

  const loadAll = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    await Promise.all([loadCategories(), loadPopular(), loadNewest(), loadRecent()]);
    loadingRef.current = false;
    setInitialLoading(false);
  }, [loadCategories, loadPopular, loadNewest, loadRecent]);

  const refresh = useCallback(async () => {
    if (refreshing || loadingRef.current) return;
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll, refreshing]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    offline,
    initialLoading,
    refreshing,
    categories,
    recommended,
    popular,
    newest,
    deals,
    recent,
    refresh,
    retryCategories: loadCategories,
    retryPopular: loadPopular,
    retryNewest: loadNewest,
    retryRecent: loadRecent,
  };
}

export type BuyerHomeData = ReturnType<typeof useBuyerHomeData>;
