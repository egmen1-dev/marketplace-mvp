import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { getCommerceUseCases } from "../../../composition/commerce-container";
import { domainErrorMessage } from "../../../domain/errors/error-factory";
import { readSnapshot, saveSnapshot } from "../../../storage/offline-cache";
import { useAppStore } from "../../../store/app-store";
import { sellerIntelligenceToView, type SellerIntelligenceView } from "./seller-intelligence-view";

export type SectionLoadState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

function emptySection<T>(data: T): SectionLoadState<T> {
  return { data, loading: true, error: null };
}

export type SellerIntelligenceDataState = {
  offline: boolean;
  sellerCapable: boolean;
  intelligence: SectionLoadState<SellerIntelligenceView | null>;
  refreshing: boolean;
  refresh: () => Promise<void>;
  retryIntelligence: () => Promise<void>;
};

const SNAPSHOT_KEY = "seller-intelligence";

export function useSellerIntelligenceData(): SellerIntelligenceDataState {
  const commerce = getCommerceUseCases();
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const openedRef = useRef(false);

  const cached = readSnapshot<SellerIntelligenceView>(SNAPSHOT_KEY)?.payload ?? null;
  const [intelligence, setIntelligence] = useState<SectionLoadState<SellerIntelligenceView | null>>(
    emptySection(cached),
  );
  const [refreshing, setRefreshing] = useState(false);

  const loadIntelligence = useCallback(async () => {
    if (offline) {
      setIntelligence((s) => ({
        data: s.data ?? cached,
        loading: false,
        error: s.data || cached ? null : "Нет сохранённых данных для оффлайн режима",
      }));
      return;
    }

    setIntelligence((s) => ({ ...s, loading: true, error: null }));
    const result = await commerce.loadSellerIntelligence.execute({});
    if (!result.ok) {
      setIntelligence((s) => ({
        data: s.data ?? cached,
        loading: false,
        error: domainErrorMessage(result.error),
      }));
      commerce.trackScreenEvent({
        screen: "seller_intelligence",
        event: "seller_intelligence_retry",
        errorCode: result.error.code,
      });
      return;
    }

    const view = sellerIntelligenceToView(result.value);
    saveSnapshot(SNAPSHOT_KEY, view);
    setIntelligence({ data: view, loading: false, error: null });
  }, [commerce.loadSellerIntelligence, commerce.trackScreenEvent, offline, cached]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    commerce.trackScreenEvent({ screen: "seller_intelligence", event: "seller_intelligence_refreshed" });
    await loadIntelligence();
    setRefreshing(false);
  }, [commerce.trackScreenEvent, loadIntelligence]);

  useFocusEffect(
    useCallback(() => {
      if (!openedRef.current) {
        openedRef.current = true;
        commerce.trackScreenEvent({ screen: "seller_intelligence", event: "seller_intelligence_opened" });
      }
      void loadIntelligence();
    }, [commerce.trackScreenEvent, loadIntelligence]),
  );

  useEffect(() => {
    if (cached && !intelligence.data) {
      setIntelligence({ data: cached, loading: false, error: null });
    }
  }, [cached, intelligence.data]);

  useEffect(() => {
    return commerce.events.subscribe("SellerProductChanged", () => {
      void loadIntelligence();
    });
  }, [commerce.events, loadIntelligence]);

  return {
    offline,
    sellerCapable,
    intelligence,
    refreshing,
    refresh,
    retryIntelligence: loadIntelligence,
  };
}
