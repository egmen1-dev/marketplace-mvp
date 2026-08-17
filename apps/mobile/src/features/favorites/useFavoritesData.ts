import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Share } from "react-native";

import {
  addToCart,
  fetchCatalog,
  fetchFavorites,
  postTelemetry,
  toggleFavorite,
  type MobileProductListItem,
} from "../../api/endpoints";
import { cacheFavoritesList, loadCachedFavoritesList } from "../../storage/favorites-cache";
import { loadRecentViews } from "../../storage/recent-views";
import { useAppStore } from "../../store/app-store";
import {
  filterByCollection,
  filterFavoritesByQuery,
  toFavoriteProductView,
  type FavoriteCollectionId,
  type FavoriteProductView,
} from "./types";

export type FavoritesDataState = {
  items: FavoriteProductView[];
  filteredItems: FavoriteProductView[];
  itemCount: number;
  searchQuery: string;
  debouncedQuery: string;
  selectedCollectionId: FavoriteCollectionId;
  continueShopping: MobileProductListItem[];
  recommendations: MobileProductListItem[];
  recommendationsFailed: boolean;
  loading: boolean;
  refreshing: boolean;
  fromCache: boolean;
  offlineBlocked: boolean;
  error: string | null;
  removingId: string | null;
  cartBusyId: string | null;
  setSearchQuery: (value: string) => void;
  clearSearch: () => void;
  setSelectedCollectionId: (id: FavoriteCollectionId) => void;
  refresh: () => Promise<void>;
  retryRecommendations: () => Promise<void>;
  removeFavorite: (productId: string) => Promise<void>;
  addProductToCart: (productId: string) => Promise<void>;
  shareList: () => Promise<void>;
  trackPdpOpen: (productId: string) => void;
  trackSearch: () => void;
};

export function useFavoritesData(): FavoritesDataState {
  const offline = useAppStore((s) => s.offline);
  const setBadges = useAppStore((s) => s.setBadges);
  const [items, setItems] = useState<FavoriteProductView[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<FavoriteCollectionId>("all");
  const [continueShopping, setContinueShopping] = useState<MobileProductListItem[]>([]);
  const [recommendations, setRecommendations] = useState<MobileProductListItem[]>([]);
  const [recommendationsFailed, setRecommendationsFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [offlineBlocked, setOfflineBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cartBusyId, setCartBusyId] = useState<string | null>(null);
  const openedRef = useRef(false);
  const emptyTelemetryRef = useRef(false);
  const searchTelemetryRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadRecommendations = useCallback(async (currentItems: FavoriteProductView[]) => {
    try {
      const res = await fetchCatalog({ sort: "popular" });
      const favoriteIds = new Set(currentItems.map((item) => item.id));
      setRecommendations(res.items.filter((item) => !favoriteIds.has(item.id)).slice(0, 8));
      setRecommendationsFailed(false);
    } catch {
      setRecommendations([]);
      setRecommendationsFailed(true);
    }
  }, []);

  const loadContinueShopping = useCallback(async (favoriteIds: Set<string>) => {
    try {
      const recent = await loadRecentViews();
      setContinueShopping(recent.filter((item) => !favoriteIds.has(item.id)).slice(0, 8));
    } catch {
      setContinueShopping([]);
    }
  }, []);

  const applyItems = useCallback(
    async (raw: MobileProductListItem[], cached: boolean) => {
      const views = raw.map(toFavoriteProductView);
      setItems(views);
      setFromCache(cached);
      setBadges({ favorites: views.length });
      const ids = new Set(views.map((item) => item.id));
      await loadContinueShopping(ids);
      if (!cached) {
        void loadRecommendations(views);
      }
      if (views.length === 0 && !cached && !emptyTelemetryRef.current) {
        emptyTelemetryRef.current = true;
        void postTelemetry({ screen: "favorites", event: "favorites_empty" });
      }
    },
    [loadContinueShopping, loadRecommendations, setBadges],
  );

  const loadFavorites = useCallback(
    async (isRefresh = false) => {
      if (offline) {
        const cached = await loadCachedFavoritesList();
        if (cached && cached.length > 0) {
          await applyItems(cached, true);
          setOfflineBlocked(false);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        setOfflineBlocked(true);
        setItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setOfflineBlocked(false);
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetchFavorites();
        await cacheFavoritesList(res.items);
        await applyItems(res.items, false);
        if (!openedRef.current) {
          openedRef.current = true;
          void postTelemetry({ screen: "favorites", event: "favorites_opened" });
        }
      } catch (err) {
        const cached = await loadCachedFavoritesList();
        if (cached && cached.length > 0) {
          await applyItems(cached, true);
        } else {
          setError(err instanceof Error ? err.message : "Не удалось загрузить избранное");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyItems, offline],
  );

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      void loadFavorites(true);
    }, [loadFavorites]),
  );

  const filteredItems = useMemo(() => {
    const byCollection = filterByCollection(items, selectedCollectionId);
    return filterFavoritesByQuery(byCollection, debouncedQuery);
  }, [debouncedQuery, items, selectedCollectionId]);

  const removeFavorite = useCallback(
    async (productId: string) => {
      setRemovingId(productId);
      try {
        await toggleFavorite(productId);
        setItems((prev) => {
          const next = prev.filter((item) => item.id !== productId);
          setBadges({ favorites: next.length });
          return next;
        });
        void postTelemetry({ screen: "favorites", event: "favorite_removed", errorCode: productId });
      } finally {
        setRemovingId(null);
      }
    },
    [setBadges],
  );

  const addProductToCart = useCallback(async (productId: string) => {
    setCartBusyId(productId);
    try {
      const cart = await addToCart(productId, 1);
      const count = Number((cart as { itemCount?: number }).itemCount ?? 0);
      if (count > 0) setBadges({ cart: count });
      void postTelemetry({ screen: "favorites", event: "favorite_to_cart", errorCode: productId });
    } finally {
      setCartBusyId(null);
    }
  }, [setBadges]);

  const shareList = useCallback(async () => {
    if (items.length === 0) return;
    const lines = items.slice(0, 12).map((item, index) => `${index + 1}. ${item.title} — lot://product/${item.id}`);
    const message = `Моя коллекция в ЛОТ (${items.length}):\n\n${lines.join("\n")}`;
    await Share.share({ message, title: "Избранное ЛОТ" });
    void postTelemetry({ screen: "favorites", event: "favorite_shared" });
  }, [items]);

  const trackPdpOpen = useCallback((productId: string) => {
    void postTelemetry({ screen: "favorites", event: "favorites_pdp_open", errorCode: productId });
  }, []);

  const trackSearch = useCallback(() => {
    if (searchTelemetryRef.current || !debouncedQuery.trim()) return;
    searchTelemetryRef.current = true;
    void postTelemetry({ screen: "favorites", event: "favorites_search" });
  }, [debouncedQuery]);

  useEffect(() => {
    if (debouncedQuery.trim()) trackSearch();
  }, [debouncedQuery, trackSearch]);

  return {
    items,
    filteredItems,
    itemCount: items.length,
    searchQuery,
    debouncedQuery,
    selectedCollectionId,
    continueShopping,
    recommendations,
    recommendationsFailed,
    loading,
    refreshing,
    fromCache,
    offlineBlocked,
    error,
    removingId,
    cartBusyId,
    setSearchQuery,
    clearSearch: () => setSearchQuery(""),
    setSelectedCollectionId,
    refresh: () => loadFavorites(true),
    retryRecommendations: () => loadRecommendations(items),
    removeFavorite,
    addProductToCart,
    shareList,
    trackPdpOpen,
    trackSearch,
  };
}
