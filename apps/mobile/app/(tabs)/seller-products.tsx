import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Animated, FlatList, RefreshControl, StyleSheet } from "react-native";

import { fetchSellerProducts, type MobileProductListItem } from "../../src/api/endpoints";
import { SellerProductCard } from "../../src/design-system/cards/SellerProductCard";
import { CommerceSearchBar } from "../../src/design-system/commerce/CommerceSearchBar";
import { PageContainer } from "../../src/design-system/layout/ScreenLayout";
import { EmptyState, ErrorState, SkeletonGrid } from "../../src/design-system/feedback/States";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useAppStore } from "../../src/store/app-store";
import { spacing } from "../../src/theme/tokens";

export default function SellerProductsScreen() {
  const fade = useFadeIn();
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const [items, setItems] = useState<MobileProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    if (offline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSellerProducts();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить товары");
    } finally {
      setLoading(false);
    }
  }, [offline]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = query ? items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())) : items;

  if (!sellerCapable) {
    return (
      <EmptyState
        preset="products"
        actionLabel="В профиль"
        onAction={() => router.push("/(tabs)/profile")}
      />
    );
  }

  if (loading && items.length === 0) {
    return (
      <PageContainer style={styles.container}>
        <SkeletonGrid count={3} />
      </PageContainer>
    );
  }

  if (error && items.length === 0) return <ErrorState title="Ошибка загрузки" description={error} onRetry={load} />;

  return (
    <PageContainer style={styles.container}>
      <Animated.View style={{ opacity: fade, flex: 1, gap: spacing.md }}>
        <CommerceSearchBar placeholder="Поиск по вашим товарам" value={query} onChangeText={setQuery} onClear={() => setQuery("")} />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SellerProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} onRefresh={load} />
          )}
          ListEmptyComponent={<EmptyState preset="products" actionLabel="Обновить" onAction={load} />}
        />
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
});
