import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchBuyerHome, fetchCatalog, fetchCategories, type MobileProductListItem } from "../../src/api/endpoints";
import {
  AppHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PageScroll,
  ProductCard,
  SearchBar,
  SectionHeader,
  SkeletonGrid,
} from "../../src/components/ui";
import { readSnapshot, saveSnapshot } from "../../src/storage/offline-cache";
import { useAppStore } from "../../src/store/app-store";
import { colors, radii, spacing, typography } from "../../src/theme/tokens";

export default function BuyerHomeScreen() {
  const offline = useAppStore((s) => s.offline);
  const [summary, setSummary] = useState(() => readSnapshot<Record<string, unknown>>("buyer-home")?.payload ?? null);
  const [popular, setPopular] = useState<MobileProductListItem[]>([]);
  const [newest, setNewest] = useState<MobileProductListItem[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (offline) {
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const [home, popularRes, newestRes, categoriesRes] = await Promise.all([
        fetchBuyerHome(),
        fetchCatalog({ sort: "popular" }),
        fetchCatalog({ sort: "newest" }),
        fetchCategories().catch(() => ({ items: [] })),
      ]);
      saveSnapshot("buyer-home", home);
      setSummary(home);
      setPopular(popularRes.items.slice(0, 6));
      setNewest(newestRes.items.slice(0, 6));
      setCategories(categoriesRes.items.slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [offline]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !summary) {
    return (
      <PageScroll>
        <SkeletonGrid />
      </PageScroll>
    );
  }

  const favourites = (summary as { favourites?: { count: number } })?.favourites?.count ?? 0;
  const orders = (summary as { orders?: { active: number } })?.orders?.active ?? 0;

  return (
    <PageScroll refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <AppHeader title="ЛОТ" subtitle="Маркетплейс рядом с вами" />

      <SearchBar
        placeholder="Искать товары, бренды, категории"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => router.push({ pathname: "/(tabs)/catalog", params: { q: search } })}
        returnKeyType="search"
      />

      {offline ? <Text style={styles.offline}>Оффлайн — показаны сохранённые данные</Text> : null}
      {error ? <ErrorState title="Не удалось обновить ленту" description={error} onRetry={load} /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        <Pressable style={styles.chip} onPress={() => router.push("/(tabs)/favorites")}>
          <Text style={styles.chipText}>Избранное · {favourites}</Text>
        </Pressable>
        <Pressable style={styles.chip} onPress={() => router.push("/(tabs)/orders")}>
          <Text style={styles.chipText}>Заказы · {orders}</Text>
        </Pressable>
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            style={styles.chipOutline}
            onPress={() => router.push({ pathname: "/(tabs)/catalog", params: { q: cat.name } })}
          >
            <Text style={styles.chipOutlineText}>{cat.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionHeader title="Рекомендуем" actionLabel="В каталог" onAction={() => router.push("/(tabs)/catalog")} />
      {popular.length === 0 ? (
        <EmptyState title="Пока пусто" description="Откройте каталог и начните покупки." actionLabel="Каталог" onAction={() => router.push("/(tabs)/catalog")} />
      ) : (
        <View style={styles.grid}>
          {popular.map((item) => (
            <ProductCard key={item.id} product={item} onPress={() => router.push(`/product/${item.id}`)} />
          ))}
        </View>
      )}

      <SectionHeader title="Новинки" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
        {newest.map((item) => (
          <ProductCard key={`new-${item.id}`} product={item} compact onPress={() => router.push(`/product/${item.id}`)} />
        ))}
      </ScrollView>

      <SectionHeader title="Популярное" />
      <View style={styles.grid}>
        {popular.slice(0, 4).map((item) => (
          <ProductCard key={`pop-${item.id}`} product={item} onPress={() => router.push(`/product/${item.id}`)} />
        ))}
      </View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  offline: { ...typography.caption, color: colors.gray500 },
  chipsRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: { backgroundColor: colors.orangeSoft, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill },
  chipText: { ...typography.caption, color: colors.orange, fontWeight: "600" },
  chipOutline: { borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill },
  chipOutlineText: { ...typography.caption, color: colors.gray900 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.md },
  horizontalList: { gap: spacing.md },
});
