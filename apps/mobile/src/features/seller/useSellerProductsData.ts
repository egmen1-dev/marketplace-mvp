import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getCommerceUseCases } from "../../composition/commerce-container";
import type { SellerProductFilter, SellerProductSort } from "../../domain/contracts/entities/seller";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { readSnapshot, saveSnapshot } from "../../storage/offline-cache";
import { useAppStore } from "../../store/app-store";
import type { SellerOperationalProductView, SellerProductsSummaryView } from "./products/seller-products-view";
import { sellerProductToOperationalView } from "./products/seller-products-view";

const SNAPSHOT_KEY = "seller-products";
const RECENT_SEARCHES_KEY = "seller-products-recent-searches";
const MAX_RECENT = 6;

type SellerProductsSnapshot = {
  items: SellerOperationalProductView[];
  summary: SellerProductsSummaryView | null;
  filter: SellerProductFilter;
  sort: SellerProductSort;
  query: string;
};

export type SellerProductsDataState = {
  offline: boolean;
  sellerCapable: boolean;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  fromCache: boolean;
  cacheSavedAt: string | null;
  items: SellerOperationalProductView[];
  summary: SellerProductsSummaryView;
  query: string;
  setQuery: (value: string) => void;
  clearQuery: () => void;
  filter: SellerProductFilter;
  setFilter: (filter: SellerProductFilter) => void;
  sort: SellerProductSort;
  setSort: (sort: SellerProductSort) => void;
  recentSearches: string[];
  applyRecentSearch: (value: string) => void;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  total: number;
};

const EMPTY_SUMMARY: SellerProductsSummaryView = {
  active: 0,
  drafts: 0,
  moderation: 0,
  needsFix: 0,
  outOfStock: 0,
  lowStock: 0,
  hidden: 0,
};

export function useSellerProductsData(): SellerProductsDataState {
  const commerce = getCommerceUseCases();
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const openedRef = useRef(false);
  const queryReadyRef = useRef(false);

  const cachedRow = readSnapshot<SellerProductsSnapshot>(SNAPSHOT_KEY);
  const cached = cachedRow?.payload;

  const [items, setItems] = useState<SellerOperationalProductView[]>(cached?.items ?? []);
  const [summary, setSummary] = useState<SellerProductsSummaryView>(cached?.summary ?? EMPTY_SUMMARY);
  const [filter, setFilterState] = useState<SellerProductFilter>(cached?.filter ?? "all");
  const [sort, setSortState] = useState<SellerProductSort>(cached?.sort ?? "updated_desc");
  const [query, setQuery] = useState(cached?.query ?? "");
  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const [recentSearches, setRecentSearches] = useState<string[]>(
    () => readSnapshot<string[]>(RECENT_SEARCHES_KEY)?.payload ?? [],
  );
  const [loading, setLoading] = useState(!cached?.items.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(Boolean(cached?.items.length));
  const [cacheSavedAt, setCacheSavedAt] = useState<string | null>(cachedRow?.savedAt ?? null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const nextCursorRef = useRef<string | null>(null);

  const persistSnapshot = useCallback(
    (nextItems: SellerOperationalProductView[], nextSummary: SellerProductsSummaryView) => {
      saveSnapshot(SNAPSHOT_KEY, {
        items: nextItems,
        summary: nextSummary,
        filter,
        sort,
        query: debouncedQuery,
      });
      setCacheSavedAt(new Date().toISOString());
    },
    [debouncedQuery, filter, sort],
  );

  const loadSummary = useCallback(async () => {
    if (offline) return;
    const result = await commerce.loadSellerProductsSummary.execute({});
    if (result.ok) {
      setSummary(result.value);
      return result.value;
    }
    return null;
  }, [commerce.loadSellerProductsSummary, offline]);

  const loadPage = useCallback(
    async (mode: "initial" | "refresh" | "more") => {
      if (!sellerCapable) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      if (offline) {
        setFromCache(true);
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      if (mode === "initial") setLoading(true);
      else if (mode === "refresh") setRefreshing(true);
      else setLoadingMore(true);
      setError(null);
      if (mode !== "more") setFromCache(false);

      const cursor = mode === "more" ? nextCursorRef.current : null;
      const result = await commerce.loadSellerProducts.execute({
        cursor,
        query: debouncedQuery || null,
        filter,
        sort,
      });

      if (result.ok) {
        const mapped = result.value.items.map(sellerProductToOperationalView);
        setItems((prev) => {
          const merged = mode === "more" ? [...prev, ...mapped] : mapped;
          persistSnapshot(merged, summary);
          return merged;
        });
        nextCursorRef.current = result.value.nextCursor;
        setNextCursor(result.value.nextCursor);
        setTotal(result.value.total);
        if (!openedRef.current) {
          openedRef.current = true;
          commerce.trackScreenEvent({ screen: "seller_products", event: "seller_products_opened" });
        }
      } else {
        const cachedSnapshot = readSnapshot<SellerProductsSnapshot>(SNAPSHOT_KEY);
        if (cachedSnapshot?.payload.items.length) {
          setItems(cachedSnapshot.payload.items);
          setSummary(cachedSnapshot.payload.summary ?? EMPTY_SUMMARY);
          setFromCache(true);
          setCacheSavedAt(cachedSnapshot.savedAt);
        } else {
          setItems([]);
          setError(domainErrorMessage(result.error));
        }
        commerce.trackScreenEvent({
          screen: "seller_products",
          event: "seller_products_retry",
          errorCode: result.error.code,
        });
      }

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [
      commerce.loadSellerProducts,
      commerce.trackScreenEvent,
      debouncedQuery,
      filter,
      offline,
      persistSnapshot,
      sellerCapable,
      sort,
      summary,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
      void loadPage("initial");
    }, [loadPage, loadSummary]),
  );

  useEffect(() => {
    if (!queryReadyRef.current) {
      queryReadyRef.current = true;
      return;
    }
    nextCursorRef.current = null;
    setNextCursor(null);
    void loadPage("refresh");
    commerce.trackScreenEvent({
      screen: "seller_products",
      event: "seller_products_filtered",
      errorCode: `${filter}:${sort}`,
    });
  }, [debouncedQuery, filter, sort]);

  useEffect(() => {
    if (!debouncedQuery) return;
    commerce.trackScreenEvent({
      screen: "seller_products",
      event: "seller_products_searched",
      errorCode: debouncedQuery.slice(0, 32),
    });
    setRecentSearches((prev) => {
      const next = [debouncedQuery, ...prev.filter((item) => item !== debouncedQuery)].slice(0, MAX_RECENT);
      saveSnapshot(RECENT_SEARCHES_KEY, next);
      return next;
    });
  }, [debouncedQuery, commerce]);

  useEffect(() => {
    return commerce.events.subscribe("SellerProductChanged", () => {
      void loadSummary();
      nextCursorRef.current = null;
      setNextCursor(null);
      void loadPage("refresh");
    });
  }, [commerce.events, loadPage, loadSummary]);

  const setFilter = useCallback((next: SellerProductFilter) => {
    setFilterState(next);
    nextCursorRef.current = null;
    setNextCursor(null);
  }, []);

  const setSort = useCallback((next: SellerProductSort) => {
    setSortState(next);
    nextCursorRef.current = null;
    setNextCursor(null);
  }, []);

  const applyRecentSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const retry = useCallback(async () => {
    commerce.trackScreenEvent({ screen: "seller_products", event: "seller_products_retry" });
    nextCursorRef.current = null;
    setNextCursor(null);
    const nextSummary = (await loadSummary()) ?? summary;
    await loadPage("refresh");
    if (nextSummary) setSummary(nextSummary);
  }, [commerce, loadPage, loadSummary, summary]);

  const loadMore = useCallback(async () => {
    if (!nextCursorRef.current || loadingMore || loading) return;
    commerce.trackScreenEvent({ screen: "seller_products", event: "seller_products_load_more" });
    await loadPage("more");
  }, [commerce, loadPage, loading, loadingMore]);

  const refresh = retry;

  return {
    offline,
    sellerCapable,
    loading,
    loadingMore,
    refreshing,
    error,
    fromCache,
    cacheSavedAt,
    items,
    summary,
    query,
    setQuery,
    clearQuery: () => setQuery(""),
    filter,
    setFilter,
    sort,
    setSort,
    recentSearches,
    applyRecentSearch,
    hasMore: Boolean(nextCursor),
    loadMore,
    refresh,
    retry,
    total,
  };
}
