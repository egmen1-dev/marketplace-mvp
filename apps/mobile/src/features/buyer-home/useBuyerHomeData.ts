import { useCallback, useEffect, useRef, useState } from "react";

import type { MobileProductCardData } from "../../design-system/commerce/ProductCard";
import { productId } from "../../domain/contracts/value-objects/ids";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { getCommerceUseCases } from "../../composition/commerce-container";
import { productSummariesToCardViews } from "../commerce/product-view";
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
  const commerce = getCommerceUseCases();
  const offline = useAppStore((s) => s.offline);
  const loadingRef = useRef(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<SectionLoadState<CategoryItem[]>>(emptySection([]));
  const [recommended, setRecommended] = useState<SectionLoadState<MobileProductCardData[]>>(emptySection([]));
  const [popular, setPopular] = useState<SectionLoadState<MobileProductCardData[]>>(emptySection([]));
  const [newest, setNewest] = useState<SectionLoadState<MobileProductCardData[]>>(emptySection([]));
  const [deals, setDeals] = useState<SectionLoadState<MobileProductCardData[]>>(emptySection([]));
  const [recent, setRecent] = useState<SectionLoadState<MobileProductCardData[]>>(emptySection([]));

  const loadCategoriesSection = useCallback(async () => {
    if (offline) {
      setCategories((s) => ({ ...s, loading: false }));
      return;
    }
    setCategories((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await commerce.loadCategories.execute({});
      if (!result.ok) throw new Error(domainErrorMessage(result.error));
      setCategories({
        data: result.value.slice(0, 12).map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug ?? undefined,
        })),
        loading: false,
        error: null,
      });
    } catch (err) {
      setCategories((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Ошибка категорий",
      }));
    }
  }, [commerce.loadCategories, offline]);

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
      const result = await commerce.loadCatalog.execute({ sort: "popular" });
      if (!result.ok) throw new Error(domainErrorMessage(result.error));
      const items = productSummariesToCardViews(result.value.items);
      setPopular({ data: items.slice(0, 8), loading: false, error: null });
      setRecommended({ data: items.slice(0, 6), loading: false, error: null });
      const promo = items.filter((p) => (discountPercent(p.price, p.compareAt) ?? 0) > 0).slice(0, 6);
      setDeals({ data: promo, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка загрузки";
      setPopular((s) => ({ ...s, loading: false, error: message }));
      setRecommended((s) => ({ ...s, loading: false, error: message }));
      setDeals((s) => ({ ...s, loading: false, error: message }));
    }
  }, [commerce.loadCatalog, offline]);

  const loadNewest = useCallback(async () => {
    if (offline) {
      setNewest((s) => ({ ...s, loading: false }));
      return;
    }
    setNewest((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await commerce.loadCatalog.execute({ sort: "newest" });
      if (!result.ok) throw new Error(domainErrorMessage(result.error));
      setNewest({ data: productSummariesToCardViews(result.value.items).slice(0, 8), loading: false, error: null });
    } catch (err) {
      setNewest((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Ошибка новинок",
      }));
    }
  }, [commerce.loadCatalog, offline]);

  const loadRecent = useCallback(async () => {
    setRecent((s) => ({ ...s, loading: true, error: null }));
    try {
      const views = await loadRecentViews();
      setRecent({ data: views as MobileProductCardData[], loading: false, error: null });
    } catch {
      setRecent({ data: [], loading: false, error: null });
    }
  }, []);

  const loadAll = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    await Promise.all([loadCategoriesSection(), loadPopular(), loadNewest(), loadRecent()]);
    loadingRef.current = false;
    setInitialLoading(false);
  }, [loadCategoriesSection, loadPopular, loadNewest, loadRecent]);

  const refresh = useCallback(async () => {
    if (refreshing || loadingRef.current) return;
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll, refreshing]);

  const onAddToCart = useCallback(
    async (id: string) => {
      const result = await commerce.addToCart.execute({ productId: productId(id), quantity: 1 });
      if (!result.ok) {
        throw new Error(domainErrorMessage(result.error));
      }
    },
    [commerce.addToCart],
  );

  const onToggleFavorite = useCallback(
    async (id: string) => {
      const result = await commerce.toggleFavorite.execute({ productId: productId(id) });
      if (!result.ok) {
        throw new Error(domainErrorMessage(result.error));
      }
    },
    [commerce.toggleFavorite],
  );

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
    retryCategories: loadCategoriesSection,
    retryPopular: loadPopular,
    retryNewest: loadNewest,
    retryRecent: loadRecent,
    onAddToCart,
    onToggleFavorite,
  };
}

export type BuyerHomeData = ReturnType<typeof useBuyerHomeData>;
