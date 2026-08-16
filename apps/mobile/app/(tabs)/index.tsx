import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  addToCart,
  fetchBuyerHome,
  fetchCatalog,
  fetchCategories,
  toggleFavorite,
  type MobileProductListItem,
} from "../../src/api/endpoints";
import {
  AppHeader,
  CommerceSearchBar,
  EmptyState,
  ErrorState,
  HomeSectionSkeleton,
  PageScroll,
  POPULAR_SEARCHES,
  ProductCard,
  SectionHeader,
  SkeletonGrid,
} from "../../src/components/ui";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { loadSearchHistory, pushSearchHistory } from "../../src/storage/search-history";
import { loadRecentViews } from "../../src/storage/recent-views";
import { readSnapshot, saveSnapshot } from "../../src/storage/offline-cache";
import { discountPercent } from "../../src/utils/format";
import { useAppStore } from "../../src/store/app-store";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

export default function BuyerHomeScreen() {
  const fade = useFadeIn();
  const offline = useAppStore((s) => s.offline);
  const [summary, setSummary] = useState(() => readSnapshot<Record<string, unknown>>("buyer-home")?.payload ?? null);
  const [recommended, setRecommended] = useState<MobileProductListItem[]>([]);
  const [popular, setPopular] = useState<MobileProductListItem[]>([]);
  const [newest, setNewest] = useState<MobileProductListItem[]>([]);
  const [promo, setPromo] = useState<MobileProductListItem[]>([]);
  const [recent, setRecent] = useState<MobileProductListItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
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
      const [home, popularRes, newestRes, categoriesRes, recentViews] = await Promise.all([
        fetchBuyerHome(),
        fetchCatalog({ sort: "popular" }),
        fetchCatalog({ sort: "newest" }),
        fetchCategories().catch(() => ({ items: [] })),
        loadRecentViews(),
      ]);
      saveSnapshot("buyer-home", home);
      setSummary(home);
      setRecommended(popularRes.items.slice(0, 4));
      setPopular(popularRes.items.slice(0, 8));
      setNewest(newestRes.items.slice(0, 8));
      setPromo(popularRes.items.filter((p) => discountPercent(p.price, p.compareAt)).slice(0, 6));
      setRecent(recentViews);
      setCategories(categoriesRes.items.slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [offline]);

  useEffect(() => {
    loadSearchHistory().then(setHistory);
    load();
  }, [load]);

  async function submitSearch(value: string) {
    const next = await pushSearchHistory(value);
    setHistory(next);
    router.push({ pathname: "/(tabs)/catalog", params: { q: value } });
  }

  if (loading && !summary) {
    return (
      <PageScroll>
        <SkeletonGrid count={4} />
        <HomeSectionSkeleton />
      </PageScroll>
    );
  }

  return (
    <PageScroll refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Animated.View style={{ opacity: fade, gap: spacing.lg }}>
        <AppHeader title="ЛОТ" subtitle="Маркетплейс рядом с вами" />

        <CommerceSearchBar
          placeholder="Искать товары, бренды, категории"
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          onSubmitEditing={() => submitSearch(search)}
          onClear={() => setSearch("")}
          history={history}
          popular={POPULAR_SEARCHES}
          showSuggestions={searchFocused}
          onSelectSuggestion={submitSearch}
        />

        {offline ? <Text style={styles.offline}>Оффлайн — показаны сохранённые данные</Text> : null}
        {error ? <ErrorState title="Не удалось обновить ленту" description={error} onRetry={load} /> : null}

        <View style={styles.section}>
          <SectionHeader title="Категории" actionLabel="Все" onAction={() => router.push("/(tabs)/catalog")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={styles.categoryChip}
                onPress={() => router.push({ pathname: "/(tabs)/catalog", params: { categoryId: cat.id, q: cat.name } })}
              >
                <Text style={styles.categoryChipText}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ProductSection title="Рекомендуем" items={recommended} onMore={() => router.push("/(tabs)/catalog")} />
        <ProductSection title="Популярное" items={popular.slice(0, 4)} horizontal={false} />
        <ProductSection title="Новинки" items={newest} horizontal />
        <ProductSection title="Продолжить просмотр" items={recent} horizontal emptyPreset="catalog" />
        <ProductSection title="Для вас" items={recommended} horizontal />
        <ProductSection title="Акции" items={promo} horizontal badge="Скидки" />
      </Animated.View>
    </PageScroll>
  );
}

function ProductSection({
  title,
  items,
  horizontal,
  onMore,
  emptyPreset,
  badge,
}: {
  title: string;
  items: MobileProductListItem[];
  horizontal?: boolean;
  onMore?: () => void;
  emptyPreset?: "catalog";
  badge?: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <SectionHeader title={title} actionLabel={onMore ? "Ещё" : undefined} onAction={onMore} />
        {badge ? <Text style={styles.promoBadge}>{badge}</Text> : null}
      </View>
      {items.length === 0 ? (
        emptyPreset ? <EmptyState preset={emptyPreset} actionLabel="В каталог" onAction={() => router.push("/(tabs)/catalog")} /> : null
      ) : horizontal ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {items.map((item) => (
            <ProductCard
              key={`${title}-${item.id}`}
              product={item}
              compact
              onPress={() => router.push(`/product/${item.id}`)}
              onFavorite={() => toggleFavorite(item.id)}
              onAddToCart={() => addToCart(item.id, 1)}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.grid}>
          {items.map((item) => (
            <ProductCard
              key={`${title}-${item.id}`}
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
              onFavorite={() => toggleFavorite(item.id)}
              onAddToCart={() => addToCart(item.id, 1)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  offline: { ...typography.caption, color: colors.gray500 },
  section: { gap: spacing.md },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  promoBadge: { ...typography.caption, color: colors.white, backgroundColor: colors.orange, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill, overflow: "hidden" },
  chipsRow: { gap: spacing.sm },
  categoryChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.gray100, minHeight: 36, justifyContent: "center" },
  categoryChipText: { ...typography.caption, color: colors.gray900, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.md },
  horizontalList: { gap: spacing.md, paddingRight: spacing.lg },
});
