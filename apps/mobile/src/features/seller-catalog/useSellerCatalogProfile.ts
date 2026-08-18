import { useCallback, useEffect, useState } from "react";

import { fetchSellerPublicProfile, postTelemetry, type MobileSellerPublicProfile } from "../../api/endpoints";
import { ApiClientError } from "../../api/client";
import { useAppStore } from "../../store/app-store";

export type SellerCatalogProfileState = {
  offline: boolean;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  profile: MobileSellerPublicProfile | null;
  refresh: () => Promise<void>;
};

export function useSellerCatalogProfile(sellerId: string | undefined): SellerCatalogProfileState {
  const offline = useAppStore((s) => s.offline);
  const [profile, setProfile] = useState<MobileSellerPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!sellerId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    if (offline) {
      setLoading(false);
      setError("Нет подключения — профиль продавца недоступен офлайн");
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const res = await fetchSellerPublicProfile(sellerId);
      setProfile(res);
      void postTelemetry({ screen: "seller_catalog", event: "seller_profile_opened", errorCode: res.id });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setNotFound(true);
        setProfile(null);
      } else {
        const message = err instanceof Error ? err.message : "Не удалось загрузить продавца";
        setError(message);
      }
      void postTelemetry({ screen: "seller_catalog", event: "seller_profile_error", errorCode: "load_failed" });
    } finally {
      setLoading(false);
    }
  }, [offline, sellerId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { offline, loading, error, notFound, profile, refresh: load };
}
