import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Animated, RefreshControl, StyleSheet, View } from "react-native";

import {
  fetchBuyerHome,
  fetchCatalog,
  fetchCategories,
  type MobileProductListItem,
} from "../../src/api/endpoints";
import { ErrorState, HomeSectionSkeleton, PageScroll, SkeletonGrid } from "../../src/components/ui";
import {
  HOME_SECTION_GAP,
  HomeCategoryRow,
  HomeHeader,
  HomeHeroBanner,
  HomeProductRail,
  HomePromoTiles,
  HomeSearchRow,
  HomeTrustStrip,
} from "../../src/home";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useCommerceActions } from "../../src/hooks/useCommerceActions";
import { pushSearchHistory } from "../../src/storage/search-history";
import { readSnapshot, saveSnapshot } from "../../src/storage/offline-cache";
import { resolveImageUrl } from "../../src/utils/format";
import { loadAppConfig } from "../../src/config/env";
import { useAppStore } from "../../src/store/app-store";
import { colors, spacing } from "../../src/theme/tokens";

export default function BuyerHomeScreen() {
  const fade = useFadeIn();
  const offline = useAppStore((s) => s.offline);
  const {
    toggleProductFavorite,
    isFavorite,
    isCartBusy,
    isFavoriteBusy,
    addProductToCart,
    incrementProductCart,
    decrementProductCart,
  } = useCommerceActions();
  const [summary, setSummary] = useState(() => readSnapshot<Record<string, unknown>>("buyer-home")?.payload ?? null);
  const [popular, setPopular] = useState<MobileProductListItem[]>([]);
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string; slug?: string }>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondaryError, setSecondaryError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (offline) {
      setLoading(false);
      return;
    }
    setError(null);
    setSecondaryError(null);
    setLoading(true);
    try {
      const [popularRes, categoriesRes] = await Promise.all([
        fetchCatalog({ sort: "popular" }),
        fetchCategories().catch(() => ({ items: [] })),
      ]);
      setPopular(popularRes.items.slice(0, 12));
      setAllCategories(categoriesRes.items);

      try {
        const home = await fetchBuyerHome();
        saveSnapshot("buyer-home", home);
        setSummary(home);
      } catch (homeErr) {
        setSecondaryError(homeErr instanceof Error ? homeErr.message : "Не удалось обновить сводку");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [offline]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitSearch(value: string) {
    const query = value.trim();
    if (!query) return;
    await pushSearchHistory(query);
    router.push({ pathname: "/(tabs)/catalog", params: { q: query } });
  }

  const heroImageUrl = useMemo(() => {
    const first = popular.find((item) => item.primaryImage?.url);
    if (!first?.primaryImage?.url) return null;
    return resolveImageUrl(first.primaryImage.url, loadAppConfig().apiBaseUrl);
  }, [popular]);

  if (loading && popular.length === 0 && !summary) {
    return (
      <PageScroll contentContainerStyle={styles.scroll}>
        <SkeletonGrid count={4} />
        <HomeSectionSkeleton />
      </PageScroll>
    );
  }

  return (
    <PageScroll
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.ctaPrimary} />}
    >
      <Animated.View style={[styles.content, { opacity: fade }]}>
        <HomeHeader />
        <HomeSearchRow value={search} onChangeText={setSearch} onSubmit={() => submitSearch(search)} />
        <HomeCategoryRow categories={allCategories} activeId="all" />
        {error && popular.length === 0 ? (
          <ErrorState title="Не удалось загрузить товары" description={error} onRetry={load} variant="network" />
        ) : (
          <HomeProductRail
            title="Популярные товары"
            items={popular}
            onMore={() => router.push({ pathname: "/(tabs)/catalog", params: { sort: "popular" } })}
            isFavorite={isFavorite}
            isFavoriteBusy={isFavoriteBusy}
            isCartBusy={isCartBusy}
            onFavorite={toggleProductFavorite}
            onPressProduct={(id) => router.push(`/product/${id}`)}
            onAddToCart={(id) => addProductToCart(id, 1)}
            onIncrementCart={incrementProductCart}
            onDecrementCart={decrementProductCart}
          />
        )}
        <HomeHeroBanner imageUrl={heroImageUrl} />
        <HomePromoTiles categories={allCategories} />
        <HomeTrustStrip />
        {secondaryError ? (
          <ErrorState title="Не удалось обновить сводку" description={secondaryError} onRetry={load} variant="network" />
        ) : null}
      </Animated.View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
    gap: HOME_SECTION_GAP,
    backgroundColor: colors.white,
  },
  content: {
    gap: HOME_SECTION_GAP,
    paddingBottom: spacing.md,
  },
});
