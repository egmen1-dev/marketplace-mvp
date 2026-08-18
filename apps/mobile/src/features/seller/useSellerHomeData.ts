import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { domainErrorMessage } from "../../domain/errors/error-factory";
import { getCommerceUseCases } from "../../domain/services/commerce-container";
import { readSnapshot, saveSnapshot } from "../../storage/offline-cache";
import { useAppStore } from "../../store/app-store";
import { sellerHomeToView, type SellerHomeView } from "./seller-view";

export type SellerHomeDataState = {
  offline: boolean;
  sellerCapable: boolean;
  data: SellerHomeView | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useSellerHomeData(): SellerHomeDataState {
  const commerce = getCommerceUseCases();
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);

  const [data, setData] = useState<SellerHomeView | null>(
    () => readSnapshot<SellerHomeView>("seller-home")?.payload ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (offline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await commerce.loadSellerHome.execute({});
    if (!result.ok) {
      setError(domainErrorMessage(result.error));
      setLoading(false);
      return;
    }
    const view = sellerHomeToView(result.value);
    saveSnapshot("seller-home", view);
    setData(view);
    setLoading(false);
  }, [commerce.loadSellerHome, offline]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return {
    offline,
    sellerCapable,
    data,
    loading,
    error,
    refresh: load,
  };
}
