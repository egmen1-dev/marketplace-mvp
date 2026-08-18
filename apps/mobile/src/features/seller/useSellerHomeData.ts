import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { getCommerceUseCases } from "../../composition/commerce-container";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { readSnapshot, saveSnapshot } from "../../storage/offline-cache";
import { useAppStore } from "../../store/app-store";
import { sellerHomeToView, type SellerHomeView } from "./seller-view";

export type SectionLoadState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

function emptySection<T>(data: T): SectionLoadState<T> {
  return { data, loading: true, error: null };
}

export type SellerHomeDataState = {
  offline: boolean;
  sellerCapable: boolean;
  dashboard: SectionLoadState<SellerHomeView | null>;
  historyReady: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  retryDashboard: () => Promise<void>;
};

const SNAPSHOT_KEY = "seller-home";

export function useSellerHomeData(): SellerHomeDataState {
  const commerce = getCommerceUseCases();
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const openedRef = useRef(false);

  const cached = readSnapshot<SellerHomeView>(SNAPSHOT_KEY)?.payload ?? null;
  const [dashboard, setDashboard] = useState<SectionLoadState<SellerHomeView | null>>(
    emptySection(cached),
  );
  const [historyReady, setHistoryReady] = useState(Boolean(cached?.recentActivity.length));
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (offline) {
      setDashboard((s) => ({
        data: s.data ?? cached,
        loading: false,
        error: s.data || cached ? null : "Нет сохранённых данных для оффлайн режима",
      }));
      setHistoryReady(Boolean((cached ?? dashboard.data)?.recentActivity.length));
      return;
    }

    setDashboard((s) => ({ ...s, loading: true, error: null }));
    const result = await commerce.loadSellerHome.execute({});
    if (!result.ok) {
      setDashboard((s) => ({
        data: s.data ?? cached,
        loading: false,
        error: domainErrorMessage(result.error),
      }));
      commerce.trackScreenEvent({
        screen: "seller_home",
        event: "seller_retry",
        errorCode: result.error.code,
      });
      return;
    }

    const view = sellerHomeToView(result.value, false);
    saveSnapshot(SNAPSHOT_KEY, view);
    setDashboard({ data: view, loading: false, error: null });
    setHistoryReady(false);
    setTimeout(() => setHistoryReady(true), 120);
  }, [commerce.loadSellerHome, commerce.trackScreenEvent, offline, cached]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    commerce.trackScreenEvent({ screen: "seller_home", event: "seller_home_refreshed" });
    await loadDashboard();
    setRefreshing(false);
  }, [commerce.trackScreenEvent, loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      if (!openedRef.current) {
        openedRef.current = true;
        commerce.trackScreenEvent({ screen: "seller_home", event: "seller_home_opened" });
      }
      void loadDashboard();
    }, [commerce.trackScreenEvent, loadDashboard]),
  );

  useEffect(() => {
    if (cached && !dashboard.data) {
      setDashboard({ data: cached, loading: false, error: null });
    }
  }, [cached, dashboard.data]);

  return {
    offline,
    sellerCapable,
    dashboard,
    historyReady,
    refreshing,
    refresh,
    retryDashboard: loadDashboard,
  };
}
