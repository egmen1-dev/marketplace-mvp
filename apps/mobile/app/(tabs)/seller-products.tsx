import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Animated, FlatList, RefreshControl, ScrollView, StyleSheet } from "react-native";

import { fetchSellerProducts, type MobileProductListItem } from "../../src/api/endpoints";
import {
  Chip,
  CommerceSearchBar,
  EmptyState,
  ErrorState,
  PageContainer,
  PrimaryButton,
  SectionHeader,
  SellerProductCard,
  SkeletonGrid,
} from "../../src/components/ui";
import { useFadeIn } from "../../src/hooks/useFadeIn";
import { useAppStore } from "../../src/store/app-store";
import { spacing } from "../../src/theme/tokens";

type SellerLotsTab = "active" | "drafts" | "sold";

const TABS: Array<{ key: SellerLotsTab; label: string }> = [
  { key: "active", label: "Активные" },
  { key: "drafts", label: "Черновики" },
  { key: "sold", label: "Проданные" },
];

export default function SellerProductsScreen() {
  const fade = useFadeIn();
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const [tab, setTab] = useState<SellerLotsTab>("active");
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
      const res = await fetchSellerProducts({ tab });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить ЛОТы");
    } finally {
      setLoading(false);
    }
  }, [offline, tab]);

  useFocusEffect(
    useCallback(() => {
      void load();
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
        <SectionHeader title="Мои ЛОТы" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((item) => (
            <Chip key={item.key} label={item.label} active={tab === item.key} onPress={() => setTab(item.key)} />
          ))}
        </ScrollView>
        <CommerceSearchBar placeholder="Поиск по вашим ЛОТам" value={query} onChangeText={setQuery} onClear={() => setQuery("")} />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SellerProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} onRefresh={load} />
          )}
          ListEmptyComponent={
            <EmptyState
              title={tab === "drafts" ? "Черновиков пока нет" : tab === "sold" ? "Проданных ЛОТов пока нет" : "Активных ЛОТов пока нет"}
              description="Создайте ЛОТ, чтобы покупатели могли его найти"
              actionLabel="Создать ЛОТ"
              onAction={() => router.push("/sell/create")}
            />
          }
          ListFooterComponent={
            tab === "active" ? (
              <PrimaryButton label="Создать ЛОТ" fullWidth onPress={() => router.push("/sell/create")} />
            ) : null
          }
        />
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  tabs: { gap: spacing.sm, paddingBottom: spacing.xs },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
});
