import { useCallback, useEffect, useState } from "react";

import type { MobileProductCardData } from "../../design-system/commerce/ProductCard";
import { getCommerceUseCases } from "../../domain/services/commerce-container";
import { domainErrorMessage } from "../../domain/errors/error-factory";
import { productId } from "../../domain/contracts/value-objects/ids";
import { productSummariesToCardViews } from "../commerce/product-view";
import { useAppStore } from "../../store/app-store";

export function useFavoritesData() {
  const commerce = getCommerceUseCases();
  const setBadges = useAppStore((s) => s.setBadges);
  const [items, setItems] = useState<MobileProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await commerce.loadFavorites.execute({});
        if (!result.ok) throw new Error(domainErrorMessage(result.error));
        setItems(productSummariesToCardViews(result.value.items));
        setBadges({ favorites: result.value.items.length });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить избранное");
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [commerce.loadFavorites, setBadges],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    return commerce.events.subscribe("FavoriteChanged", () => {
      void load(false);
    });
  }, [commerce.events, load]);

  const onToggleFavorite = useCallback(
    async (id: string) => {
      const result = await commerce.toggleFavorite.execute({ productId: productId(id) });
      if (!result.ok) {
        setError(domainErrorMessage(result.error));
        return;
      }
      if (!result.value.isFavorite) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    },
    [commerce.toggleFavorite],
  );

  return {
    items,
    loading,
    refreshing,
    error,
    refresh: () => load(true),
    onToggleFavorite,
  };
}

export type FavoritesDataState = ReturnType<typeof useFavoritesData>;
