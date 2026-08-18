import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { getCommerceUseCases } from "../../composition/commerce-container";
import type { SellerOrderFilter } from "../../domain/contracts/entities/seller";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { readSnapshot, saveSnapshot } from "../../storage/offline-cache";
import { useAppStore } from "../../store/app-store";
import type { SellerOperationalOrderView, SellerOrdersSummaryView } from "../seller/orders/seller-orders-view";
import { sellerOrderToOperationalView } from "../seller/orders/seller-orders-view";

const SNAPSHOT_KEY = "seller-sales";
const RECENT_SEARCHES_KEY = "seller-orders-recent-searches";
const MAX_RECENT = 6;

type SellerSalesSnapshot = {
  items: SellerOperationalOrderView[];
  summary: SellerOrdersSummaryView | null;
  filter: SellerOrderFilter;
  query: string;
};

export type SellerSalesState = {
  offline: boolean;
  sellerCapable: boolean;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  fromCache: boolean;
  cacheSavedAt: string | null;
  orders: SellerOperationalOrderView[];
  summary: SellerOrdersSummaryView;
  query: string;
  setQuery: (value: string) => void;
  clearQuery: () => void;
  filter: SellerOrderFilter;
  setFilter: (filter: SellerOrderFilter) => void;
  recentSearches: string[];
  applyRecentSearch: (value: string) => void;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  total: number;
};

const EMPTY_SUMMARY: SellerOrdersSummaryView = {
  newCount: 0,
  inProgress: 0,
  awaitingShipment: 0,
  readyForPickup: 0,
  overdue: 0,
};

export function useSellerSalesData(): SellerSalesState {
  const commerce = getCommerceUseCases();
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const openedRef = useRef(false);
  const queryReadyRef = useRef(false);

  const cachedRow = readSnapshot<SellerSalesSnapshot>(SNAPSHOT_KEY);
  const cached = cachedRow?.payload;

  const [orders, setOrders] = useState<SellerOperationalOrderView[]>(cached?.items ?? []);
  const [summary, setSummary] = useState<SellerOrdersSummaryView>(cached?.summary ?? EMPTY_SUMMARY);
  const [filter, setFilterState] = useState<SellerOrderFilter>(cached?.filter ?? "all");
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
    (nextItems: SellerOperationalOrderView[], nextSummary: SellerOrdersSummaryView) => {
      saveSnapshot(SNAPSHOT_KEY, {
        items: nextItems,
        summary: nextSummary,
        filter,
        query: debouncedQuery,
      });
      setCacheSavedAt(new Date().toISOString());
    },
    [debouncedQuery, filter],
  );

  const loadSummary = useCallback(async () => {
    if (offline) return;
    const result = await commerce.loadSellerOrdersSummary.execute({});
    if (result.ok) {
      setSummary(result.value);
      return result.value;
    }
    return null;
  }, [commerce.loadSellerOrdersSummary, offline]);

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
      const [pageResult, summaryResult] = await Promise.all([
        commerce.loadSellerOrders.execute({
          cursor,
          query: debouncedQuery || null,
          filter,
        }),
        mode !== "more" ? loadSummary() : Promise.resolve(null),
      ]);

      if (pageResult.ok) {
        const mapped = pageResult.value.items.map(sellerOrderToOperationalView);
        setOrders((prev) => {
          const merged = mode === "more" ? [...prev, ...mapped] : mapped;
          persistSnapshot(merged, summaryResult ?? summary);
          return merged;
        });
        setNextCursor(pageResult.value.nextCursor);
        nextCursorRef.current = pageResult.value.nextCursor;
        setTotal(pageResult.value.total);

        if (!openedRef.current) {
          openedRef.current = true;
          commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_orders_opened" });
        }
        if (debouncedQuery && mode !== "more") {
          commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_orders_searched" });
        }
        if (filter !== "all" && mode !== "more") {
          commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_orders_filtered" });
        }
      } else {
        const cachedSnapshot = readSnapshot<SellerSalesSnapshot>(SNAPSHOT_KEY);
        if (cachedSnapshot?.payload.items.length && mode !== "more") {
          setOrders(cachedSnapshot.payload.items);
          setSummary(cachedSnapshot.payload.summary ?? EMPTY_SUMMARY);
          setFromCache(true);
        } else if (mode !== "more") {
          setOrders([]);
          setError(domainErrorMessage(pageResult.error));
          commerce.trackScreenEvent({
            screen: "seller_sales",
            event: "seller_orders_error",
            errorCode: "load_failed",
          });
        }
      }

      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    },
    [
      commerce.loadSellerOrders,
      commerce.trackScreenEvent,
      debouncedQuery,
      filter,
      loadSummary,
      offline,
      persistSnapshot,
      sellerCapable,
      summary,
    ],
  );

  useEffect(() => {
    void loadPage("initial");
  }, [loadPage]);

  useFocusEffect(
    useCallback(() => {
      if (queryReadyRef.current) {
        void loadPage("refresh");
      } else {
        queryReadyRef.current = true;
      }
    }, [loadPage]),
  );

  useEffect(() => {
    return commerce.events.subscribe("SellerOrderChanged", () => {
      void loadPage("refresh");
    });
  }, [commerce.events, loadPage]);

  const setFilter = useCallback((next: SellerOrderFilter) => {
    setFilterState(next);
    setNextCursor(null);
    nextCursorRef.current = null;
  }, []);

  const pushRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    setRecentSearches((prev) => {
      const next = [term, ...prev.filter((v) => v !== term)].slice(0, MAX_RECENT);
      saveSnapshot(RECENT_SEARCHES_KEY, next);
      return next;
    });
  }, []);

  const applyRecentSearch = useCallback((term: string) => {
    setQuery(term);
  }, []);

  useEffect(() => {
    if (debouncedQuery) pushRecentSearch(debouncedQuery);
  }, [debouncedQuery, pushRecentSearch]);

  return {
    offline,
    sellerCapable,
    loading,
    loadingMore,
    refreshing,
    error,
    fromCache,
    cacheSavedAt,
    orders,
    summary,
    query,
    setQuery,
    clearQuery: () => setQuery(""),
    filter,
    setFilter,
    recentSearches,
    applyRecentSearch,
    hasMore: Boolean(nextCursor),
    loadMore: () => {
      if (!nextCursorRef.current || loadingMore) return Promise.resolve();
      commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_orders_load_more" });
      return loadPage("more");
    },
    refresh: () => loadPage("refresh"),
    retry: () => {
      commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_orders_retry" });
      return loadPage("initial");
    },
    total,
  };
}

export function formatSellerSaleAmount(order: SellerOperationalOrderView): string {
  return `${order.sellerSubtotal.toLocaleString("ru-RU")} ${order.currency === "RUB" ? "₽" : order.currency}`;
}
