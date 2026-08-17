import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { toggleFavorite, type MobileProductListItem } from "../../api/endpoints";
import { PrimaryButton } from "../../components/ui";
import { CatalogCategoryRail } from "../../design-system/components/CatalogCategoryRail";
import { CatalogGridSkeleton, CatalogProductCard } from "../../design-system/components/CatalogProductCard";
import { CatalogSearchField } from "../../design-system/components/CatalogSearchField";
import { CatalogSortSheet } from "../../design-system/components/CatalogSortSheet";
import { QuickFilterRail } from "../../design-system/components/QuickFilterRail";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { brand, surface, text } from "../../design-system/tokens/colors";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { clearSearchHistory, loadSearchHistory, pushSearchHistory } from "../../storage/search-history";
import type { CatalogDiscoveryState } from "./useCatalogDiscovery";

const GRID_GAP = spacing.md;
const H_PADDING = spacing.lg;

type Props = {
  state: CatalogDiscoveryState;
};

export function CatalogDiscoveryExperience({ state }: Props) {
  const insets = useSafeAreaInsets();
  const [searchFocused, setSearchFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [sortOpen, setSortOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistory(await loadSearchHistory());
  }, []);

  const submitSearch = useCallback(
    async (value: string) => {
      state.setQuery(value);
      setSearchFocused(false);
      const next = await pushSearchHistory(value);
      setHistory(next);
    },
    [state],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <CatalogSearchField
          value={state.query}
          onChangeText={state.setQuery}
          onFocus={() => {
            void loadHistory();
            setSearchFocused(true);
          }}
          onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
          onSubmitEditing={() => void submitSearch(state.query)}
          onClear={() => state.setQuery("")}
          history={history}
          popular={state.popularSearches}
          suggestions={state.suggestions}
          suggestLoading={state.suggestLoading}
          showSuggestions={searchFocused}
          onSelectSuggestion={(value) => void submitSearch(value)}
          onClearHistory={async () => {
            await clearSearchHistory();
            setHistory([]);
          }}
        />

        <QuickFilterRail activeId={state.quickFilter} onChange={state.setQuickFilter} />

        {!state.categoriesLoading ? (
          <CatalogCategoryRail categories={state.categories} activeId={state.category?.id ?? null} onSelect={state.setCategory} />
        ) : null}

        <Pressable
          style={styles.sortButton}
          onPress={() => setSortOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Сортировка: ${state.sortLabel}`}
        >
          <MaterialCommunityIcons name="sort-variant" size={18} color={text.primary} />
          <Text style={styles.sortLabel}>{state.sortLabel}</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={text.muted} />
        </Pressable>

        {state.category ? (
          <Text style={styles.contextLine} numberOfLines={1}>
            Категория: {state.category.name}
          </Text>
        ) : null}
      </View>
    ),
    [history, loadHistory, searchFocused, state, submitSearch],
  );

  const renderItem = useCallback(
    ({ item }: { item: MobileProductListItem }) => (
      <CatalogProductCard
        product={item}
        onPress={() => router.push(`/product/${item.id}`)}
        onFavorite={() => toggleFavorite(item.id)}
      />
    ),
    [],
  );

  if (state.offline && state.items.length === 0 && !state.initialLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        {listHeader}
        <View style={styles.offlineBox}>
          <MaterialCommunityIcons name="wifi-off" size={40} color={text.muted} />
          <Text style={styles.offlineTitle}>Нет подключения к интернету</Text>
          <Text style={styles.offlineText}>Проверьте сеть и попробуйте снова</Text>
          <PrimaryButton label="Повторить" onPress={() => void state.retry()} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {state.initialLoading && state.items.length === 0 ? (
        <View style={styles.staticBody}>
          {listHeader}
          <CatalogGridSkeleton count={6} />
        </View>
      ) : (
        <FlatList
          data={state.items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xxl }]}
          ListHeaderComponent={listHeader}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void state.refresh()} tintColor={brand.primary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => void state.loadMore()}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          ListFooterComponent={
            state.loadingMore ? (
              <View style={styles.footerSkeleton}>
                <CatalogGridSkeleton count={2} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            state.error ? (
              <SectionErrorCard message={state.error} onRetry={() => void state.retry()} />
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Ничего не найдено</Text>
                <Text style={styles.emptyText}>Попробуйте изменить запрос или очистить фильтры</Text>
                <PrimaryButton label="Очистить фильтры" onPress={state.resetFilters} />
              </View>
            )
          }
        />
      )}

      <CatalogSortSheet
        visible={sortOpen}
        sort={state.sort}
        onSelect={(sort) => {
          state.setSort(sort);
          if (state.quickFilter === "newest" || state.quickFilter === "popular") {
            state.setQuickFilter("all");
          }
        }}
        onClose={() => setSortOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: surface.background, paddingHorizontal: H_PADDING },
  staticBody: { flex: 1, gap: spacing.md },
  headerBlock: { gap: spacing.md, paddingBottom: spacing.md },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: surface.backgroundMuted,
    backgroundColor: surface.background,
  },
  sortLabel: { ...typography.body, color: text.primary, fontWeight: "600" },
  contextLine: { ...typography.caption, color: text.muted },
  listContent: { gap: GRID_GAP },
  row: { gap: GRID_GAP },
  footerSkeleton: { marginTop: spacing.md },
  emptyBox: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyTitle: { ...typography.h3, color: text.primary, textAlign: "center" },
  emptyText: { ...typography.body, color: text.muted, textAlign: "center" },
  offlineBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  offlineTitle: { ...typography.h3, color: text.primary, textAlign: "center" },
  offlineText: { ...typography.body, color: text.muted, textAlign: "center" },
});
