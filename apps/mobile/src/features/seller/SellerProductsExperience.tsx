import { router } from "expo-router";
import { Animated, FlatList, RefreshControl, StyleSheet } from "react-native";

import { SellerProductCard } from "../../design-system/cards/SellerProductCard";
import { CommerceSearchBar } from "../../design-system/commerce/CommerceSearchBar";
import { PageContainer } from "../../design-system/layout/ScreenLayout";
import { EmptyState, ErrorState, SkeletonGrid } from "../../design-system/feedback/States";
import { useFadeIn } from "../../hooks/useFadeIn";
import { spacing } from "../../theme/tokens";
import type { SellerProductsDataState } from "./useSellerProductsData";

type Props = {
  state: SellerProductsDataState;
};

export function SellerProductsExperience({ state }: Props) {
  const fade = useFadeIn();
  const { sellerCapable, loading, error, query, setQuery, clearQuery, filtered, refresh } = state;

  if (!sellerCapable) {
    return (
      <EmptyState preset="products" actionLabel="В профиль" onAction={() => router.push("/(tabs)/profile")} />
    );
  }

  if (loading && state.items.length === 0) {
    return (
      <PageContainer style={styles.container}>
        <SkeletonGrid count={3} />
      </PageContainer>
    );
  }

  if (error && state.items.length === 0) {
    return <ErrorState title="Ошибка загрузки" description={error} onRetry={() => void refresh()} />;
  }

  return (
    <PageContainer style={styles.container}>
      <Animated.View style={{ opacity: fade, flex: 1, gap: spacing.md }}>
        <CommerceSearchBar
          placeholder="Поиск по вашим товарам"
          value={query}
          onChangeText={setQuery}
          onClear={clearQuery}
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SellerProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
              onRefresh={() => void refresh()}
            />
          )}
          ListEmptyComponent={<EmptyState preset="products" actionLabel="Обновить" onAction={() => void refresh()} />}
        />
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
});
