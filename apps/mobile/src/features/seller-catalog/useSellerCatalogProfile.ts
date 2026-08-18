import { useCallback, useEffect, useState } from "react";

import { domainErrorMessage } from "../../domain/errors/error-factory";
import { sellerId } from "../../domain/contracts/value-objects/ids";
import { getCommerceUseCases } from "../../domain/services/commerce-container";
import { useAppStore } from "../../store/app-store";
import { sellerPublicProfileToView, type SellerPublicProfileView } from "../seller/seller-view";

export type SellerCatalogProfileState = {
  offline: boolean;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  profile: SellerPublicProfileView | null;
  refresh: () => Promise<void>;
};

function isNotFoundError(error: { details?: Readonly<Record<string, unknown>> }): boolean {
  const status = error.details?.status;
  return status === 404 || status === "404";
}

export function useSellerCatalogProfile(sellerIdRaw: string | undefined): SellerCatalogProfileState {
  const commerce = getCommerceUseCases();
  const offline = useAppStore((s) => s.offline);
  const [profile, setProfile] = useState<SellerPublicProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!sellerIdRaw) {
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

    const result = await commerce.loadSellerPublicProfile.execute({ sellerId: sellerId(sellerIdRaw) });
    if (result.ok) {
      const view = sellerPublicProfileToView(result.value);
      setProfile(view);
      commerce.trackScreenEvent({ screen: "seller_catalog", event: "seller_profile_opened", errorCode: view.id });
    } else if (isNotFoundError(result.error)) {
      setNotFound(true);
      setProfile(null);
      commerce.trackScreenEvent({ screen: "seller_catalog", event: "seller_profile_error", errorCode: "load_failed" });
    } else {
      setError(domainErrorMessage(result.error));
      commerce.trackScreenEvent({ screen: "seller_catalog", event: "seller_profile_error", errorCode: "load_failed" });
    }

    setLoading(false);
  }, [commerce.loadSellerPublicProfile, commerce.trackScreenEvent, offline, sellerIdRaw]);

  useEffect(() => {
    void load();
  }, [load]);

  return { offline, loading, error, notFound, profile, refresh: load };
}
