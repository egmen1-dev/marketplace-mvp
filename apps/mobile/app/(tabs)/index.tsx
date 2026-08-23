import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  fetchBuyerHome,
  fetchCatalog,
  fetchCategories,
  type MobileProductListItem,
} from "../../src/api/endpoints";
import { CommerceHeader } from "../../src/components/CommerceHeader";
import {
  CategoryRail,
  Chip,
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
import { useCommerceActions } from "../../src/hooks/useCommerceActions";
import { loadSearchHistory, pushSearchHistory } from "../../src/storage/search-history";
import { loadRecentViews } from "../../src/storage/recent-views";
import { readSnapshot, saveSnapshot } from "../../src/storage/offline-cache";
import { discountPercent } from "../../src/utils/format";
import { selectRailCategories } from "../../src/catalog/rail-categories";
import { openSellerStorefront } from "../../src/navigation/seller-routes";
import { useAppStore } from "../../src/store/app-store";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

type QuickFilter = "for_you" | "deals" | "new" | "popular";

const QUICK_FILTERS: Array<{ id: QuickFilter; label: string }> = [
  { id: "for_you", label: "Для вас" },
  { id: "deals", label: "Скидки" },
  { id: "new", label: "Новинки" },
  { id: "popular", label: "Популярное" },
];

export default function BuyerHomeScreen() {
  const fade = useFadeIn();
  const offline = useAppStore((s) => s.offline);
  const { addProductToCart, toggleProductFavorite, isFavorite } = useCommerceActions();
  const [summary, setSummary] = useState(() => readSnapshot<Record<string, unknown>>("buyer-home")?.payload ?? null);
  const [recommended, setRecommended] = useState<MobileProductListItem[]>([]);
  const [popular, setPopular] = useState<MobileProductListItem[]>([]);
  const [newest, setNewest] = useState<MobileProductListItem[]>([]);
  const [promo, setPromo] = useState<MobileProductListItem[]>([]);
  const [recent, setRecent] = useState<MobileProductListItem[]>([]);
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string; catalogProductCount?: number; productCount?: number }>>([]);
  const railCategories = useMemo(() => selectRailCategories(allCategories), [allCategories]);
  const [history, setHistory] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("for_you");
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
      setRecommended(popularRes.items.slice(0, 8));
      setPopular(popularRes.items.slice(0, 8));
      setNewest(newestRes.items.slice(0, 8));
      setPromo(popularRes.items.filter((p) => discountPercent(p.price, p.compareAt)).slice(0, 8));
      setRecent(recentViews);
      setAllCategories(categoriesRes.items);
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

  function openQuickFilter(filter: QuickFilter) {
    setActiveFilter(filter);
    if (filter === "deals") {
      router.push({ pathname: "/(tabs)/catalog", params: { deals: "1", sort: "popular" } });
      return;
    }
    if (filter === "new") {
      router.push({ pathname: "/(tabs)/catalog", params: { sort: "newest" } });
      return;
    }
    if (filter === "popular") {
      router.push({ pathname: "/(tabs)/catalog", params: { sort: "popular" } });
    }
  }

  const featuredItems =
    activeFilter === "new" ? newest : activeFilter === "deals" ? promo : activeFilter === "popular" ? popular : recommended;

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
        <CommerceHeader subtitle="Товары рядом с вами — покупайте и продавайте" />

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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {QUICK_FILTERS.map((filter) => (
            <Chip
              key={filter.id}
              label={filter.label}
              active={activeFilter === filter.id}
              onPress={() => openQuickFilter(filter.id)}
            />
          ))}
        </ScrollView>

        {offline ? <Text style={styles.offline}>Оффлайн — показаны сохранённые данные</Text> : null}
        {error ? <ErrorState title="Не удалось обновить ленту" description={error} onRetry={load} variant="network" /> : null}

        <View style={styles.section}>
          <SectionHeader title="Категории" actionLabel="Все" onAction={() => router.push("/(tabs)/catalog")} />
          <CategoryRail
            categories={railCategories}
            activeId={null}
            onSelect={(cat) => {
              if (!cat) {
                router.push("/(tabs)/catalog");
                return;
              }
              router.push({
                pathname: "/(tabs)/catalog",
                params: { categoryId: cat.id, q: "", deals: "0" },
              });
            }}
          />
        </View>

        <ProductSection
          title="Рекомендуем"
          items={featuredItems.slice(0, 4)}
          onMore={() => router.push("/(tabs)/catalog")}
          isFavorite={isFavorite}
          onFavorite={toggleProductFavorite}
          onAddToCart={addProductToCart}
        />
        <ProductSection
          title="Популярное"
          items={popular.slice(0, 4)}
          horizontal={false}
          isFavorite={isFavorite}
          onFavorite={toggleProductFavorite}
          onAddToCart={addProductToCart}
        />
        <ProductSection
          title="Новинки"
          items={newest}
          horizontal
          isFavorite={isFavorite}
          onFavorite={toggleProductFavorite}
          onAddToCart={addProductToCart}
        />
        <ProductSection title="Продолжить просмотр" items={recent} horizontal emptyPreset="catalog" isFavorite={isFavorite} onFavorite={toggleProductFavorite} onAddToCart={addProductToCart} />
        <ProductSection
          title="Выгодные предложения"
          items={promo}
          horizontal
          badge="Скидки"
          isFavorite={isFavorite}
          onFavorite={toggleProductFavorite}
          onAddToCart={addProductToCart}
        />
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
  isFavorite,
  onFavorite,
  onAddToCart,
}: {
  title: string;
  items: MobileProductListItem[];
  horizontal?: boolean;
  onMore?: () => void;
  emptyPreset?: "catalog";
  badge?: string;
  isFavorite: (id: string) => boolean;
  onFavorite: (id: string) => void;
  onAddToCart: (id: string, qty?: number) => Promise<void>;
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
              isFavorite={isFavorite(item.id)}
              onPress={() => router.push(`/product/${item.id}`)}
              onFavorite={() => onFavorite(item.id)}
              onAddToCart={() => onAddToCart(item.id, 1)}
              onSellerPress={item.seller?.id ? () => openSellerStorefront(item.seller!.id!, item.seller?.storeName) : undefined}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.grid}>
          {items.map((item) => (
            <View key={`${title}-${item.id}`} style={styles.cardCell}>
              <ProductCard
                product={item}
                width="100%"
                isFavorite={isFavorite(item.id)}
                onPress={() => router.push(`/product/${item.id}`)}
                onFavorite={() => onFavorite(item.id)}
                onAddToCart={() => onAddToCart(item.id, 1)}
                onSellerPress={item.seller?.id ? () => openSellerStorefront(item.seller!.id!, item.seller?.storeName) : undefined}
              />
            </View>
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
  chipsRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.md, alignItems: "stretch" },
  cardCell: { width: "48%" },
  horizontalList: { gap: spacing.md, paddingRight: spacing.lg },
});
