import { useCallback, useEffect, useRef, useState } from "react";

import type { MobileProductCardData } from "../../design-system/commerce/ProductCard";
import { getCommerceUseCases } from "../../domain/services/commerce-container";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { categoryId, productId, sellerId as toSellerId } from "../../domain/contracts/value-objects/ids";
import { productSummariesToCardViews } from "../commerce/product-view";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { POPULAR_SEARCHES } from "../../storage/search-history";
import { discountPercent } from "../../utils/format";
import { useAppStore } from "../../store/app-store";
import {
  type CatalogSort,
  type ProductSuggestItem,
  type QuickFilterId,
  resolveCatalogQuery,
  sortLabel,
} from "./types";

export type CategoryItem = { id: string; name: string; slug?: string };

export function useCatalogDiscovery(
  initialQuery = "",
  initialCategoryId?: string | null,
  sellerId?: string | null,
) {
  const commerce = getCommerceUseCases();
  const offline = useAppStore((s) => s.offline);
  const setBadges = useAppStore((s) => s.setBadges);
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const [sort, setSort] = useState<CatalogSort>("popular");
  const [quickFilter, setQuickFilter] = useState<QuickFilterId>("all");
  const [category, setCategory] = useState<CategoryItem | null>(
    initialCategoryId ? { id: initialCategoryId, name: "Категория" } : null,
  );
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [items, setItems] = useState<MobileProductCardData[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSuggestItem[]>([]);

  const cursorRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const resolved = resolveCatalogQuery({ quickFilter, sort });

  useEffect(() => {
    return commerce.events.subscribe("FavoriteChanged", (event) => {
      setBadges({ favorites: event.favoritesCount ?? undefined });
    });
  }, [commerce.events, setBadges]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const result = await commerce.loadCategories.execute({});
      if (!result.ok) {
        setCategories([]);
        return;
      }
      const list = result.value.slice(0, 16).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug ?? undefined,
      }));
      setCategories(list);
      if (initialCategoryId) {
        const match = list.find((c) => c.id === initialCategoryId);
        if (match) setCategory(match);
      }
    } catch {
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, [commerce.loadCategories, initialCategoryId]);

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (offline) {
        setInitialLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        return;
      }
      if (inFlightRef.current && !reset) return;
      inFlightRef.current = true;

      if (reset) {
        setError(null);
        setInitialLoading(true);
        cursorRef.current = null;
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await commerce.loadCatalog.execute({
          q: debouncedQuery || undefined,
          cursor: reset ? null : cursorRef.current,
          sort: resolved.sort,
          categoryId: category?.id ? categoryId(category.id) : undefined,
          sellerId: sellerId ? toSellerId(sellerId) : undefined,
          inStock: resolved.inStock,
        });

        if (!result.ok) {
          throw new Error(domainErrorMessage(result.error));
        }

        let nextItems = productSummariesToCardViews(result.value.items);
        if (resolved.dealsOnly) {
          nextItems = nextItems.filter((item) => (discountPercent(item.price, item.compareAt) ?? 0) > 0);
        }

        setItems((prev) => (reset ? nextItems : [...prev, ...nextItems]));
        cursorRef.current = result.value.nextCursor;
        setHasMore(Boolean(result.value.nextCursor));
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Ошибка загрузки каталога";
        if (reset) {
          setItems([]);
          setError(message);
        }
      } finally {
        inFlightRef.current = false;
        setInitialLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [offline, debouncedQuery, resolved.sort, resolved.inStock, resolved.dealsOnly, category?.id, sellerId, commerce.loadCatalog],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPage(true);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || initialLoading || offline) return;
    await loadPage(false);
  }, [hasMore, loadingMore, initialLoading, offline, loadPage]);

  const retry = useCallback(async () => {
    await loadPage(true);
  }, [loadPage]);

  const resetFilters = useCallback(() => {
    setQuery("");
    setQuickFilter("all");
    setSort("popular");
    setCategory(null);
  }, []);

  const onToggleFavorite = useCallback(
    async (id: string) => {
      const result = await commerce.toggleFavorite.execute({ productId: productId(id) });
      if (!result.ok) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, favoritesCount: result.value.favoritesCount ?? item.favoritesCount } : item,
        ),
      );
    },
    [commerce.toggleFavorite],
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadPage(true);
  }, [debouncedQuery, resolved.sort, resolved.inStock, resolved.dealsOnly, category?.id, offline, sellerId]);

  useEffect(() => {
    if (debouncedQuery.length < 2 || offline) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestLoading(true);
    void commerce.searchProducts
      .execute({ query: debouncedQuery })
      .then((result) => {
        if (cancelled || !result.ok) {
          if (!cancelled) setSuggestions([]);
          return;
        }
        setSuggestions(
          result.value.slice(0, 8).map((item, index) => ({
            type: "product",
            id: String(index),
            title: item.text,
            slug: "",
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setSuggestLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, offline, commerce.searchProducts]);

  return {
    offline,
    query,
    setQuery,
    debouncedQuery,
    sort,
    setSort,
    sortLabel: sortLabel(sort),
    quickFilter,
    setQuickFilter,
    category,
    setCategory,
    categories,
    categoriesLoading,
    items,
    initialLoading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    suggestLoading,
    suggestions,
    popularSearches: POPULAR_SEARCHES,
    loadMore,
    refresh,
    retry,
    resetFilters,
    onToggleFavorite,
  };
}

export type CatalogDiscoveryState = ReturnType<typeof useCatalogDiscovery>;
