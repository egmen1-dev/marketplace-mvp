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
import { loadSearchHistory, pushSearchHistory } from "../../src/storage/search-history";
import { readSnapshot, saveSnapshot } from "../../src/storage/offline-cache";
import { resolveImageUrl } from "../../src/utils/format";
import { loadAppConfig } from "../../src/config/env";
import { useAppStore } from "../../src/store/app-store";
import { colors, spacing } from "../../src/theme/tokens";

export default function BuyerHomeScreen() {
  const fade = useFadeIn();
  const offline = useAppStore((s) => s.offline);
  const { toggleProductFavorite, isFavorite } = useCommerceActions();
  const [summary, setSummary] = useState(() => readSnapshot<Record<string, unknown>>("buyer-home")?.payload ?? null);
  const [popular, setPopular] = useState<MobileProductListItem[]>([]);
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string; slug?: string }>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (offline) {
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const [home, popularRes, categoriesRes] = await Promise.all([
        fetchBuyerHome(),
        fetchCatalog({ sort: "popular" }),
        fetchCategories().catch(() => ({ items: [] })),
      ]);
      saveSnapshot("buyer-home", home);
      setSummary(home);
      setPopular(popularRes.items.slice(0, 12));
      setAllCategories(categoriesRes.items);
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

  if (loading && !summary) {
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
        <HomeHeroBanner imageUrl={heroImageUrl} />
        <HomeProductRail
          title="Популярные товары"
          items={popular}
          onMore={() => router.push({ pathname: "/(tabs)/catalog", params: { sort: "popular" } })}
          isFavorite={isFavorite}
          onFavorite={toggleProductFavorite}
          onPressProduct={(id) => router.push(`/product/${id}`)}
        />
        <HomeTrustStrip />
        <HomePromoTiles />
        {error ? <ErrorState title="Не удалось обновить ленту" description={error} onRetry={load} variant="network" /> : null}
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
