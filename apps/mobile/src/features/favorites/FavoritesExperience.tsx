import { router } from "expo-router";
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/ui";
import { FavoriteWishlistCard } from "../../design-system/components/FavoriteWishlistCard";
import { FavoritesCollectionsRail } from "../../design-system/components/FavoritesCollectionsRail";
import { FavoritesContinueRail } from "../../design-system/components/FavoritesContinueRail";
import { FavoritesEmptyState } from "../../design-system/components/FavoritesEmptyState";
import { FavoritesHeader } from "../../design-system/components/FavoritesHeader";
import { FavoritesRecommendationsRail } from "../../design-system/components/FavoritesRecommendationsRail";
import { FavoritesSearchField } from "../../design-system/components/FavoritesSearchField";
import { FavoritesSkeleton } from "../../design-system/components/FavoritesSkeleton";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { FAVORITE_COLLECTIONS } from "./types";
import { surface, text } from "../../design-system/tokens/colors";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { useFadeIn } from "../../hooks/useFadeIn";
import type { FavoritesDataState } from "./useFavoritesData";

type Props = {
  state: FavoritesDataState;
};

export function FavoritesExperience({ state }: Props) {
  const insets = useSafeAreaInsets();
  const fade = useFadeIn();

  if (state.loading) {
    return <FavoritesSkeleton />;
  }

  if (state.offlineBlocked) {
    return (
      <View style={[styles.offline, { paddingTop: insets.top + spacing["2xl"] }]}>
        <MaterialCommunityIcons name="wifi-off" size={48} color={text.muted} />
        <Text style={styles.offlineTitle}>Нет подключения</Text>
        <Text style={styles.offlineBody}>Сохранённая коллекция недоступна. Откройте раздел при подключении к интернету.</Text>
        <PrimaryButton label="Повторить" onPress={() => void state.refresh()} />
      </View>
    );
  }

  const isEmpty = state.itemCount === 0;

  if (isEmpty) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing["2xl"] }]}
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void state.refresh()} />}
      >
        <FavoritesHeader itemCount={0} fromCache={state.fromCache} shareDisabled />
        <FavoritesSearchField value={state.searchQuery} onChangeText={state.setSearchQuery} onClear={state.clearSearch} />
        <FavoritesCollectionsRail
          collections={FAVORITE_COLLECTIONS}
          selectedId={state.selectedCollectionId}
          onSelect={state.setSelectedCollectionId}
        />
        {state.error ? <SectionErrorCard message={state.error} onRetry={() => void state.refresh()} /> : null}
        <FavoritesEmptyState onBrowseCatalog={() => router.push("/(tabs)/catalog")} />
        <FavoritesContinueRail items={state.continueShopping} />
        <FavoritesRecommendationsRail
          items={state.recommendations}
          failed={state.recommendationsFailed}
          onRetry={() => void state.retryRecommendations()}
        />
      </ScrollView>
    );
  }

  const showNoSearchResults = state.filteredItems.length === 0 && state.debouncedQuery.trim().length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing["2xl"] }]}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void state.refresh()} />}
    >
      <Animated.View style={{ opacity: fade, gap: spacing.lg }}>
        <FavoritesHeader
          itemCount={state.itemCount}
          fromCache={state.fromCache}
          onShare={() => void state.shareList()}
          shareDisabled={state.itemCount === 0}
        />

        <FavoritesSearchField value={state.searchQuery} onChangeText={state.setSearchQuery} onClear={state.clearSearch} />

        <FavoritesCollectionsRail
          collections={FAVORITE_COLLECTIONS}
          selectedId={state.selectedCollectionId}
          onSelect={state.setSelectedCollectionId}
        />

        {state.error ? <SectionErrorCard message={state.error} onRetry={() => void state.refresh()} /> : null}

        {showNoSearchResults ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsTitle}>Ничего не найдено</Text>
            <Text style={styles.noResultsBody}>Попробуйте другой запрос в вашей коллекции.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {state.filteredItems.map((product) => (
              <View key={product.id} style={styles.gridItem}>
                <FavoriteWishlistCard
                  product={product}
                  removing={state.removingId === product.id}
                  cartBusy={state.cartBusyId === product.id}
                  onPress={() => {
                    state.trackPdpOpen(product.id);
                    router.push(`/product/${product.id}`);
                  }}
                  onRemove={() => void state.removeFavorite(product.id)}
                  onAddToCart={() => void state.addProductToCart(product.id)}
                />
              </View>
            ))}
          </View>
        )}

        <FavoritesContinueRail items={state.continueShopping} />

        <FavoritesRecommendationsRail
          items={state.recommendations}
          failed={state.recommendationsFailed}
          onRetry={() => void state.retryRecommendations()}
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.md },
  gridItem: { width: "48%" },
  noResults: { alignItems: "center", paddingVertical: spacing["2xl"], gap: spacing.sm },
  noResultsTitle: { ...typography.h2, color: text.primary },
  noResultsBody: { ...typography.body, color: text.secondary, textAlign: "center" },
  offline: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
    backgroundColor: surface.background,
  },
  offlineTitle: { ...typography.h2, color: text.primary },
  offlineBody: { ...typography.body, color: text.secondary, textAlign: "center" },
});
