import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Share } from "react-native";

import { logout } from "../../api/client";
import {
  fetchBuyerHome,
  fetchCart,
  fetchFavorites,
  fetchMobileUpdate,
  postTelemetry,
  submitProductFeedback,
  type MobileUpdateInfo,
} from "../../api/endpoints";
import { getMobileBuildInfo, formatBuildDate } from "../../config/build-info";
import { loadAppConfig } from "../../config/env";
import { clearLocalAppCache } from "../../storage/clear-local-cache";
import { loadCachedFavoritesList } from "../../storage/favorites-cache";
import { cacheProfileSnapshot, loadCachedProfileSnapshot } from "../../storage/profile-cache";
import { loadRecentViews, type StoredView } from "../../storage/recent-views";
import { getSessionMeta, type StoredSessionMeta } from "../../storage/secure-session";
import { buildErrorReport } from "../../telemetry/error-report";
import { startApkDownload } from "../../update/download-apk";
import { UPDATE_ANALYTICS } from "../../update/types";
import { useAppStore } from "../../store/app-store";
import {
  deriveTopCategories,
  formatAccountLabel,
  type ProfileCategoryStat,
  type ProfileShoppingStats,
  type ProfileSnapshot,
  type QuickAction,
} from "./types";

export type ProfileDataState = {
  meta: StoredSessionMeta | null;
  displayName: string;
  displayEmail: string;
  mode: "buyer" | "seller";
  sellerCapable: boolean;
  buildInfo: ReturnType<typeof getMobileBuildInfo>;
  buildDateLabel: string;
  stats: ProfileShoppingStats;
  topCategories: ProfileCategoryStat[];
  recentViewsCount: number;
  recentItems: StoredView[];
  quickActions: QuickAction[];
  updateInfo: MobileUpdateInfo | null;
  hasUpdate: boolean;
  loading: boolean;
  refreshing: boolean;
  fromCache: boolean;
  offlineBlocked: boolean;
  error: string | null;
  dangerSheetVisible: boolean;
  setDangerSheetVisible: (visible: boolean) => void;
  refresh: () => Promise<void>;
  switchMode: () => void;
  logout: () => Promise<void>;
  clearLocalCache: () => Promise<void>;
  openSupport: () => Promise<void>;
  openDiagnostics: () => void;
  openBuildInfo: () => void;
  reportCrash: () => Promise<void>;
  startUpdate: () => Promise<void>;
  openUrl: (path: string) => void;
};

export function useProfileData(): ProfileDataState {
  const offline = useAppStore((s) => s.offline);
  const mode = useAppStore((s) => s.mode);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const badges = useAppStore((s) => s.badges);
  const setMode = useAppStore((s) => s.setMode);
  const setBadges = useAppStore((s) => s.setBadges);

  const buildInfo = getMobileBuildInfo();
  const [meta, setMeta] = useState<StoredSessionMeta | null>(null);
  const [displayName, setDisplayName] = useState("—");
  const [displayEmail, setDisplayEmail] = useState("—");
  const [stats, setStats] = useState<ProfileShoppingStats>({
    ordersCount: null,
    favoritesCount: null,
    recentViewsCount: null,
    cartCount: null,
  });
  const [topCategories, setTopCategories] = useState<ProfileCategoryStat[]>([]);
  const [recentViewsCount, setRecentViewsCount] = useState(0);
  const [recentItems, setRecentItems] = useState<StoredView[]>([]);
  const [updateInfo, setUpdateInfo] = useState<MobileUpdateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [offlineBlocked, setOfflineBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dangerSheetVisible, setDangerSheetVisible] = useState(false);
  const openedRef = useRef(false);

  const applySnapshot = useCallback((snapshot: ProfileSnapshot, cached: boolean) => {
    setMeta(snapshot.meta);
    setDisplayName(snapshot.displayName);
    setDisplayEmail(snapshot.displayEmail);
    setStats(snapshot.stats);
    setTopCategories(snapshot.topCategories);
    setRecentViewsCount(snapshot.stats.recentViewsCount ?? 0);
    setUpdateInfo(snapshot.updateInfo);
    setFromCache(cached);
  }, []);

  const loadProfile = useCallback(
    async (isRefresh = false) => {
      const sessionMeta = await getSessionMeta();
      const account = formatAccountLabel(sessionMeta);
      const recent = await loadRecentViews();

      if (offline) {
        const cached = await loadCachedProfileSnapshot();
        if (cached) {
          applySnapshot(cached, true);
        } else {
          setMeta(sessionMeta);
          setDisplayName(account.name);
          setDisplayEmail(account.email);
          setRecentViewsCount(recent.length);
          setStats({
            ordersCount: null,
            favoritesCount: null,
            recentViewsCount: recent.length > 0 ? recent.length : null,
            cartCount: null,
          });
          setFromCache(false);
        }
        setRecentItems(recent);
        setOfflineBlocked(false);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setOfflineBlocked(false);
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const [buyerHome, cart, update, favoritesCached] = await Promise.all([
          fetchBuyerHome().catch(() => null),
          fetchCart().catch(() => null),
          fetchMobileUpdate().catch(() => null),
          loadCachedFavoritesList().catch(() => null),
        ]);

        let favoritesItems = favoritesCached ?? [];
        if ((buyerHome?.favourites.count ?? 0) > 0 && favoritesItems.length === 0) {
          const favRes = await fetchFavorites().catch(() => null);
          favoritesItems = favRes?.items ?? [];
        }

        const nextStats: ProfileShoppingStats = {
          ordersCount: buyerHome ? buyerHome.orders.active : null,
          favoritesCount: buyerHome ? buyerHome.favourites.count : null,
          recentViewsCount: recent.length > 0 ? recent.length : null,
          cartCount: cart ? Number(cart.itemCount ?? 0) : null,
        };

        if (cart) {
          setBadges({ cart: Number(cart.itemCount ?? 0) });
        }

        const categories = favoritesItems.length > 0 ? deriveTopCategories(favoritesItems) : [];

        const snapshot: ProfileSnapshot = {
          savedAt: Date.now(),
          meta: sessionMeta,
          displayName: account.name,
          displayEmail: account.email,
          buildInfo,
          stats: nextStats,
          topCategories: categories,
          updateInfo: update,
        };

        await cacheProfileSnapshot(snapshot);
        applySnapshot(snapshot, false);
        setRecentViewsCount(recent.length);
        setRecentItems(recent);

        if (!openedRef.current) {
          openedRef.current = true;
          void postTelemetry({ screen: "profile", event: "profile_opened" });
        }
      } catch (err) {
        const cached = await loadCachedProfileSnapshot();
        if (cached) {
          applySnapshot(cached, true);
        } else {
          setError(err instanceof Error ? err.message : "Не удалось загрузить профиль");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applySnapshot, buildInfo, offline, setBadges],
  );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile(true);
    }, [loadProfile]),
  );

  const hasUpdate = Boolean(
    updateInfo &&
      updateInfo.updateState !== "NO_UPDATE" &&
      updateInfo.downloadUrl &&
      updateInfo.versionCode > buildInfo.versionCode &&
      updateInfo.rollout.eligible,
  );

  const quickActions: QuickAction[] = [
    { id: "orders", label: "Мои заказы", icon: "clipboard-text-clock-outline", badge: badges.orders, route: "/(tabs)/orders" },
    { id: "favorites", label: "Избранное", icon: "heart-outline", badge: badges.favorites, route: "/(tabs)/favorites" },
    { id: "cart", label: "Корзина", icon: "cart-outline", badge: badges.cart, route: "/cart" },
    { id: "wallet", label: "Кошелёк", icon: "wallet-outline", route: "/(tabs)/wallet" },
    { id: "recent", label: "Недавние", icon: "history", badge: recentViewsCount || undefined, route: "/(tabs)/catalog" },
  ];

  const switchMode = useCallback(() => {
    const next = mode === "buyer" ? "seller" : "buyer";
    setMode(next);
    void postTelemetry({ screen: "profile", event: "profile_edit", errorCode: `mode_${next}` });
  }, [mode, setMode]);

  const handleLogout = useCallback(async () => {
    setDangerSheetVisible(false);
    await logout();
    void postTelemetry({ screen: "profile", event: "profile_logout" });
  }, []);

  const clearLocalCache = useCallback(async () => {
    await clearLocalAppCache();
    setDangerSheetVisible(false);
    void postTelemetry({ screen: "profile", event: "profile_cache_clear" });
    await loadProfile(true);
  }, [loadProfile]);

  const openSupport = useCallback(async () => {
    void postTelemetry({ screen: "profile", event: "profile_support" });
    const config = loadAppConfig();
    await Linking.openURL(`${config.apiBaseUrl}/about`);
  }, []);

  const openDiagnostics = useCallback(() => {
    void postTelemetry({ screen: "profile", event: "diagnostics_opened" });
  }, []);

  const openBuildInfo = useCallback(() => {
    void postTelemetry({ screen: "profile", event: "build_info_opened" });
  }, []);

  const reportCrash = useCallback(async () => {
    const report = buildErrorReport("profile");
    await submitProductFeedback({ content: JSON.stringify(report), screen: "profile" }).catch(() => null);
    await Share.share({ message: JSON.stringify(report, null, 2), title: "ЛОТ — Crash Report" });
  }, []);

  const startUpdate = useCallback(async () => {
    if (!updateInfo) return;
    void postTelemetry({ screen: "profile", event: "profile_update", errorCode: updateInfo.versionName });
    void postTelemetry({ screen: "profile", event: UPDATE_ANALYTICS.started, errorCode: updateInfo.versionName });
    await startApkDownload(updateInfo);
  }, [updateInfo]);

  const openUrl = useCallback((path: string) => {
    const config = loadAppConfig();
    void Linking.openURL(`${config.apiBaseUrl}${path}`);
  }, []);

  return {
    meta,
    displayName,
    displayEmail,
    mode,
    sellerCapable,
    buildInfo,
    buildDateLabel: formatBuildDate(buildInfo.buildDate),
    stats,
    topCategories,
    recentViewsCount,
    recentItems,
    quickActions,
    updateInfo,
    hasUpdate,
    loading,
    refreshing,
    fromCache,
    offlineBlocked,
    error,
    dangerSheetVisible,
    setDangerSheetVisible,
    refresh: () => loadProfile(true),
    switchMode,
    logout: handleLogout,
    clearLocalCache,
    openSupport,
    openDiagnostics,
    openBuildInfo,
    reportCrash,
    startUpdate,
    openUrl,
  };
}
