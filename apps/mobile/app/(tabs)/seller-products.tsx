import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { Animated, FlatList, RefreshControl, ScrollView, StyleSheet } from "react-native";

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
import { isSellerProductPublic } from "../../src/seller/resolve-lot-publish-outcome";
import { useSellerProductsList } from "../../src/seller/use-seller-products-list";
import { useAppStore } from "../../src/store/app-store";
import { spacing } from "../../src/theme/tokens";

type SellerLotsTab = "active" | "pending" | "drafts" | "sold";

const TABS: Array<{ key: SellerLotsTab; label: string }> = [
  { key: "active", label: "Активные" },
  { key: "pending", label: "На проверке" },
  { key: "drafts", label: "Сохранённые" },
  { key: "sold", label: "Проданные" },
];

function resolveInitialTab(value: string | string[] | undefined): SellerLotsTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "pending" || raw === "drafts" || raw === "sold") return raw;
  return "active";
}

export default function SellerProductsScreen() {
  const fade = useFadeIn();
  const params = useLocalSearchParams<{ tab?: string }>();
  const offline = useAppStore((s) => s.offline);
  const sellerCapable = useAppStore((s) => s.sellerCapable);
  const tab = resolveInitialTab(params.tab);
  const { items, loading, error, query, setQuery, refresh } = useSellerProductsList(tab, offline);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const hasSearch = query.trim().length > 0;
  const showInitialSkeleton = loading && items.length === 0 && !hasSearch;

  if (!sellerCapable) {
    return (
      <EmptyState
        preset="products"
        actionLabel="В профиль"
        onAction={() => router.push("/(tabs)/profile")}
      />
    );
  }

  if (showInitialSkeleton) {
    return (
      <PageContainer style={styles.container}>
        <SkeletonGrid count={3} />
      </PageContainer>
    );
  }

  if (error && items.length === 0) {
    return <ErrorState title="Ошибка загрузки" description={error} onRetry={refresh} />;
  }

  return (
    <PageContainer style={styles.container}>
      <Animated.View style={{ opacity: fade, flex: 1, gap: spacing.md }}>
        <SectionHeader title="Мои ЛОТы" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              active={tab === item.key}
              onPress={() => {
                if (item.key !== tab) {
                  router.setParams({ tab: item.key });
                }
              }}
            />
          ))}
        </ScrollView>
        <CommerceSearchBar
          placeholder="Поиск по вашим ЛОТам"
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery("")}
        />
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SellerProductCard
              product={item}
              onPress={() => {
                const isPublic = isSellerProductPublic(
                  item.status ?? "DRAFT",
                  (item as { isPublic?: boolean }).isPublic,
                );
                const href = isPublic ? `/product/${item.id}` : `/sell/lot/${item.id}`;
                router.push(href as `/product/${string}` | `/sell/lot/${string}`);
              }}
              onRefresh={refresh}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title={
                hasSearch
                  ? "По вашему запросу ничего не найдено"
                  : tab === "active"
                    ? "У вас пока нет ЛОТов"
                    : tab === "pending"
                      ? "ЛОТов на проверке пока нет"
                      : tab === "drafts"
                        ? "Сохранённых ЛОТов пока нет"
                        : "Проданных ЛОТов пока нет"
              }
              description={
                hasSearch
                  ? "Попробуйте другой запрос или очистите поиск"
                  : tab === "active"
                    ? "Создайте первый ЛОТ — покупатели увидят его в каталоге"
                    : tab === "pending"
                      ? "Отправьте ЛОТ на проверку — он появится здесь"
                      : "Создайте ЛОТ, чтобы покупатели могли его найти"
              }
              actionLabel={
                hasSearch
                  ? "Очистить поиск"
                  : tab === "sold"
                    ? "Создать ЛОТ"
                    : tab === "active"
                      ? "Создать первый ЛОТ"
                      : "Создать ЛОТ"
              }
              onAction={() => (hasSearch ? setQuery("") : router.push("/sell/create"))}
            />
          }
          ListFooterComponent={
            tab === "active" && !hasSearch ? (
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
