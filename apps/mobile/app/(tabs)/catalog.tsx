import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, RefreshControl, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchCatalog, fetchCategories, fetchProductSuggest, type MobileProductListItem } from "../../src/api/endpoints";
import { selectRailCategories } from "../../src/catalog/rail-categories";
import {
  CatalogCategoryRow,
  CatalogFilterBar,
  CatalogLoadMore,
  CatalogSearchRow,
  CatalogSearchPanel,
  CatalogSkeletonGrid,
  CatalogTitleRow,
  CATALOG_GRID_GAP,
  CATALOG_SCREEN_PADDING,
} from "../../src/catalog/ui";
import { EmptyState, ErrorState, type CatalogSort } from "../../src/components/ui";
import {
  applyDealsOnlyFilter,
  buildCatalogQueryKey,
  canRequestCatalogPage,
  createRequestGeneration,
  isStaleCatalogRequest,
  mergeCatalogProducts,
  resolveCatalogPaginationTruth,
} from "../../src/commerce/catalog-query";
import { ProductCard } from "../../src/commerce/product-card";
import {
  createSuggestRequestGeneration,
  normalizeSearchQuery,
  SEARCH_DEBOUNCE_MS,
  shouldRequestSuggestions,
  type SearchSuggestion,
} from "../../src/commerce/search-state";
import { HomeHeader } from "../../src/home";
import { useCommerceActions } from "../../src/hooks/useCommerceActions";
import { clearSearchHistory, loadSearchHistory, pushSearchHistory } from "../../src/storage/search-history";
import { colors } from "../../src/theme/tokens";

const SORT_VALUES = new Set<CatalogSort>(["popular", "newest", "price_asc", "price_desc"]);

function parseSort(value: unknown): CatalogSort {
  return typeof value === "string" && SORT_VALUES.has(value as CatalogSort) ? (value as CatalogSort) : "popular";
}

function resolveCategoryFromList(
  categoryId: string,
  list: Array<{ id: string; name: string }>,
): { id: string; name: string } {
  const match = list.find((c) => c.id === categoryId);
  return match ? { id: match.id, name: match.name } : { id: categoryId, name: "Категория" };
}

export default function CatalogScreen() {
  const params = useLocalSearchParams<{
    q?: string;
    categoryId?: string;
    sort?: string;
    sellerId?: string;
    sellerName?: string;
    deals?: string;
    focusSearch?: string;
  }>();
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);
  const {
    addProductToCart,
    incrementProductCart,
    decrementProductCart,
    toggleProductFavorite,
    isFavorite,
    isCartBusy,
    isFavoriteBusy,
  } = useCommerceActions();

  const initialQuery = typeof params.q === "string" ? normalizeSearchQuery(params.q) : "";
  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState(initialQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [sort, setSort] = useState<CatalogSort>(parseSort(params.sort));
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(params.deals === "1");
  const [category, setCategory] = useState<{ id: string; name: string } | null>(
    typeof params.categoryId === "string" ? resolveCategoryFromList(params.categoryId, []) : null,
  );
  const [sellerFilter, setSellerFilter] = useState<{ id: string; name: string } | null>(
    typeof params.sellerId === "string"
      ? { id: params.sellerId, name: typeof params.sellerName === "string" ? params.sellerName : "Продавец" }
      : null,
  );
  const [allCategories, setAllCategories] = useState<
    Array<{ id: string; name: string; slug?: string; catalogProductCount?: number; productCount?: number }>
  >([]);
  const railCategories = useMemo(() => selectRailCategories(allCategories), [allCategories]);
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [countMode, setCountMode] = useState<"server" | "client_deals">("server");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const requestGenerationRef = useRef(createRequestGeneration());
  const suggestGenerationRef = useRef(createSuggestRequestGeneration());
  const paginationInFlightRef = useRef(false);
  const lastRequestedCursorRef = useRef<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(false);
  const loadingRef = useRef(loading);
  const loadingMoreRef = useRef(loadingMore);

  const queryKey = useMemo(
    () =>
      buildCatalogQueryKey({
        q: committedQuery,
        sort,
        categoryId: category?.id,
        sellerId: sellerFilter?.id,
        inStockOnly,
        dealsOnly,
      }),
    [committedQuery, sort, category?.id, sellerFilter?.id, inStockOnly, dealsOnly],
  );

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    fetchCategories()
      .then((res) => {
        const list = res.items;
        setAllCategories(list);
        if (typeof params.categoryId === "string") {
          setCategory(resolveCategoryFromList(params.categoryId, list));
        }
      })
      .catch(() => null);
  }, [params.categoryId]);

  useFocusEffect(
    useCallback(() => {
      if (typeof params.categoryId === "string") {
        setCategory((prev) => {
          const resolved = resolveCategoryFromList(params.categoryId!, allCategories);
          if (prev?.id === resolved.id && prev?.name === resolved.name) return prev;
          return resolved;
        });
        setInputQuery("");
        setCommittedQuery("");
        setSellerFilter(null);
        if (params.deals !== "1") setDealsOnly(false);
      } else if (typeof params.q === "string" && params.q.length > 0) {
        const nextQuery = normalizeSearchQuery(params.q);
        setInputQuery(nextQuery);
        setCommittedQuery(nextQuery);
        setCategory(null);
      }
      if (typeof params.sort === "string") setSort(parseSort(params.sort));
      if (params.deals === "1") setDealsOnly(true);
      if (typeof params.sellerId === "string") {
        setSellerFilter({
          id: params.sellerId,
          name: typeof params.sellerName === "string" ? params.sellerName : "Продавец",
        });
        setCategory(null);
        setInputQuery("");
        setCommittedQuery("");
      }
    }, [params.categoryId, params.q, params.sort, params.deals, params.sellerId, params.sellerName, allCategories]),
  );

  useEffect(() => {
    if (params.focusSearch === "1") {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [params.focusSearch]);

  useEffect(() => {
    const requestGeneration = suggestGenerationRef.current.invalidate();
    setSuggestions([]);
    setSuggestionsLoading(false);
    setDebouncedQuery("");
    if (!shouldRequestSuggestions(inputQuery)) return;

    const timer = setTimeout(() => {
      const query = normalizeSearchQuery(inputQuery);
      setDebouncedQuery(query);
      setSuggestionsLoading(true);
      void fetchProductSuggest(query)
        .then((response) => {
          if (!suggestGenerationRef.current.isCurrent(requestGeneration)) return;
          setSuggestions(response.items);
        })
        .catch(() => {
          if (!suggestGenerationRef.current.isCurrent(requestGeneration)) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (suggestGenerationRef.current.isCurrent(requestGeneration)) setSuggestionsLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [inputQuery]);

  const openSearch = useCallback(() => {
    setSearchFocused(true);
    void loadSearchHistory().then(setSearchHistory).catch(() => setSearchHistory([]));
  }, []);

  const loadCatalog = useCallback(
    async (reset: boolean, requestGeneration: number, forQueryKey: string) => {
      const cursorToFetch = reset ? null : cursorRef.current;
      if (
        !canRequestCatalogPage({
          reset,
          hasMore: hasMoreRef.current,
          loading: loadingRef.current,
          loadingMore: loadingMoreRef.current,
          paginationInFlight: paginationInFlightRef.current,
          cursor: cursorToFetch,
          lastRequestedCursor: lastRequestedCursorRef.current,
          requestQueryKey: forQueryKey,
          activeQueryKey: queryKey,
        })
      ) {
        return;
      }

      if (reset) {
        setLoading(true);
        setError(null);
        lastRequestedCursorRef.current = null;
      } else {
        setLoadingMore(true);
        paginationInFlightRef.current = true;
        lastRequestedCursorRef.current = cursorToFetch;
      }

      try {
        const res = await fetchCatalog({
          q: committedQuery || undefined,
          cursor: cursorToFetch,
          sort,
          categoryId: category?.id,
          sellerId: sellerFilter?.id,
          inStock: inStockOnly || undefined,
        });

        if (isStaleCatalogRequest(requestGeneration, requestGenerationRef.current.current())) return;
        if (forQueryKey !== queryKey) return;

        const nextItems = dealsOnly ? applyDealsOnlyFilter(res.items) : res.items;
        setItems((prev) => mergeCatalogProducts(prev, nextItems, reset));

        const pagination = resolveCatalogPaginationTruth(dealsOnly, res.hasMore, res.nextCursor);
        setCursor(pagination.nextCursor);
        setHasMore(pagination.hasMore);
        setCountMode(pagination.countMode);
      } catch (err) {
        if (isStaleCatalogRequest(requestGeneration, requestGenerationRef.current.current())) return;
        if (forQueryKey !== queryKey) return;
        if (reset) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
      } finally {
        if (!reset) paginationInFlightRef.current = false;
        if (!isStaleCatalogRequest(requestGeneration, requestGenerationRef.current.current()) && forQueryKey === queryKey) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [category?.id, committedQuery, dealsOnly, inStockOnly, queryKey, sellerFilter?.id, sort],
  );

  useEffect(() => {
    const requestGeneration = requestGenerationRef.current.next();
    setCursor(null);
    setHasMore(false);
    setItems([]);
    lastRequestedCursorRef.current = null;
    paginationInFlightRef.current = false;
    void loadCatalog(true, requestGeneration, queryKey);
  }, [queryKey, loadCatalog]);

  async function commitSearch(value: string) {
    const normalized = normalizeSearchQuery(value);
    if (!normalized) {
      clearSearch();
      return;
    }
    suggestGenerationRef.current.invalidate();
    setSuggestions([]);
    setSuggestionsLoading(false);
    setInputQuery(normalized);
    setCategory(null);
    setSellerFilter(null);
    setDealsOnly(false);
    setCommittedQuery(normalized);
    setSearchFocused(false);
    Keyboard.dismiss();
    const nextHistory = await pushSearchHistory(normalized);
    setSearchHistory(nextHistory);
  }

  function clearSearch() {
    suggestGenerationRef.current.invalidate();
    setSuggestions([]);
    setSuggestionsLoading(false);
    setDebouncedQuery("");
    setInputQuery("");
    setCommittedQuery("");
    setCategory(null);
    setSellerFilter(null);
    setDealsOnly(false);
  }

  function clearFilters() {
    setInputQuery("");
    setCommittedQuery("");
    setCategory(null);
    setSellerFilter(null);
    setInStockOnly(false);
    setDealsOnly(false);
    setSort("popular");
  }

  function catalogEmptyPreset(): "catalog" | "catalogCategory" | "catalogSearch" {
    if (committedQuery) return "catalogSearch";
    if (category) return "catalogCategory";
    return "catalog";
  }

  const requestMore = useCallback(() => {
    void loadCatalog(false, requestGenerationRef.current.current(), queryKey);
  }, [loadCatalog, queryKey]);

  const searchPanelMode = useMemo(() => {
    if (!searchFocused) return "closed" as const;
    if (!normalizeSearchQuery(inputQuery)) return "history" as const;
    if (!shouldRequestSuggestions(inputQuery)) return "closed" as const;
    if (suggestionsLoading || debouncedQuery !== normalizeSearchQuery(inputQuery)) return "loading" as const;
    return suggestions.length > 0 ? ("suggestions" as const) : ("closed" as const);
  }, [debouncedQuery, inputQuery, searchFocused, suggestions.length, suggestionsLoading]);

  const listHeader = (
    <View style={styles.headerBlock}>
      <HomeHeader />
      <CatalogSearchRow
        inputRef={searchInputRef}
        value={inputQuery}
        onChangeText={setInputQuery}
        onSubmit={() => void commitSearch(inputQuery)}
        onFocus={openSearch}
        onClear={clearSearch}
        onFilterPress={() => setFiltersOpen(true)}
      />
      <CatalogSearchPanel
        mode={searchPanelMode}
        history={searchHistory}
        suggestions={suggestions}
        onSelect={(value) => void commitSearch(value)}
        onClearHistory={() => {
          void clearSearchHistory().then(() => setSearchHistory([]));
        }}
      />
      <CatalogCategoryRow
        activeCategoryId={category?.id ?? null}
        categories={railCategories}
        onSelect={(cat) => {
          setCategory(cat);
          setSellerFilter(null);
          setDealsOnly(false);
          if (cat) {
            setInputQuery("");
            setCommittedQuery("");
          }
          else clearFilters();
        }}
      />
      <CatalogTitleRow count={items.length} hasMore={hasMore} countMode={countMode} />
      <CatalogFilterBar
        sort={sort}
        onSortChange={setSort}
        dealsOnly={dealsOnly}
        onDealsChange={setDealsOnly}
        inStockOnly={inStockOnly}
        onInStockChange={setInStockOnly}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        categoryName={category?.name ?? sellerFilter?.name ?? null}
        onClearCategory={() => {
          setCategory(null);
          setSellerFilter(null);
        }}
        onResetFilters={clearFilters}
      />
      {error && items.length === 0 ? (
        <ErrorState
          title="Не удалось загрузить товары"
          onRetry={() => void loadCatalog(true, requestGenerationRef.current.next(), queryKey)}
          variant="network"
        />
      ) : null}
      {loading && items.length === 0 ? <CatalogSkeletonGrid count={6} /> : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={loading && items.length === 0 ? [] : items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setSearchFocused(false)}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            refreshing={loading && items.length > 0}
            onRefresh={() => void loadCatalog(true, requestGenerationRef.current.next(), queryKey)}
            tintColor={colors.ctaPrimary}
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            variant="grid"
            product={item}
            isFavorite={isFavorite(item.id)}
            isFavoriteBusy={isFavoriteBusy(item.id)}
            isCartBusy={isCartBusy(item.id)}
            onPress={() => router.push(`/product/${item.id}`)}
            onFavorite={() => toggleProductFavorite(item.id)}
            onAddToCart={() => addProductToCart(item.id, 1)}
            onIncrementCart={() => incrementProductCart(item.id)}
            onDecrementCart={() => decrementProductCart(item.id)}
          />
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState preset={catalogEmptyPreset()} actionLabel="Сбросить фильтры" onAction={clearFilters} />
          ) : null
        }
        ListFooterComponent={
          hasMore && items.length > 0 ? <CatalogLoadMore loading={loadingMore} onPress={requestMore} /> : <View style={styles.footerSpacer} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={requestMore}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerBlock: {
    gap: 14,
    paddingBottom: 8,
    backgroundColor: colors.white,
  },
  list: {
    paddingHorizontal: CATALOG_SCREEN_PADDING,
    flexGrow: 1,
  },
  row: {
    gap: CATALOG_GRID_GAP,
    marginBottom: CATALOG_GRID_GAP,
  },
  footerSpacer: {
    height: 8,
  },
});
