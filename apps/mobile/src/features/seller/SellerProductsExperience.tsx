import { router } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SellerOperationalProductCard } from "../../design-system/cards/SellerOperationalProductCard";
import { CommerceSearchBar } from "../../design-system/commerce/CommerceSearchBar";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { SellerProductSortSheet } from "../../design-system/components/SellerProductSortSheet";
import { SecondaryButton } from "../../design-system/forms/buttons";
import { EmptyState, HomeSectionSkeleton } from "../../design-system/feedback/States";
import { PageContainer } from "../../design-system/layout/ScreenLayout";
import { Badge } from "../../design-system/primitives/Badge";
import { brand, border, semantic, surface, text } from "../../design-system/tokens/colors";
import { layout } from "../../design-system/tokens/layout";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { getCommerceUseCases } from "../../composition/commerce-container";
import type { SellerActionKind } from "../../domain/contracts/entities/seller";
import { useFadeIn } from "../../hooks/useFadeIn";
import { ActionResultBanner } from "./action-center/ActionResultBanner";
import { SellerActionSheet } from "./action-center/SellerActionSheet";
import { useSellerActionCenter } from "./action-center/useSellerActionCenter";
import type { SellerProductsDataState } from "./useSellerProductsData";
import { SellerProductActionsSheet } from "./products/SellerProductActionsSheet";
import {
  SELLER_PRODUCT_FILTER_LABELS,
  SELLER_PRODUCT_SUMMARY_KEYS,
  productToActionTask,
  type SellerOperationalProductView,
} from "./products/seller-products-view";
import { resolveProductMenuActions } from "./products/seller-product-actions";

type Props = { state: SellerProductsDataState };

const MemoCard = memo(function ProductRow({
  item,
  onOpen,
  onMenu,
}: {
  item: SellerOperationalProductView;
  onOpen: (item: SellerOperationalProductView) => void;
  onMenu: (item: SellerOperationalProductView) => void;
}) {
  return (
    <SellerOperationalProductCard
      product={item}
      onPress={() => onOpen(item)}
      onMenuPress={() => onMenu(item)}
    />
  );
});

function SummaryLane({
  summary,
  activeFilter,
  onSelect,
}: {
  summary: SellerProductsDataState["summary"];
  activeFilter: SellerProductsDataState["filter"];
  onSelect: SellerProductsDataState["setFilter"];
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
      {SELLER_PRODUCT_SUMMARY_KEYS.map(({ key, filter, label }) => (
        <Pressable
          key={String(key)}
          style={[styles.summaryChip, activeFilter === filter ? styles.summaryChipActive : null]}
          accessibilityRole="button"
          accessibilityState={{ selected: activeFilter === filter }}
          onPress={() => onSelect(filter)}
        >
          <Text style={[styles.summaryLabel, activeFilter === filter ? styles.summaryLabelActive : null]}>
            {label}
          </Text>
          <Badge label={String(summary[key])} tone={summary[key] > 0 ? "warning" : "neutral"} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

function FilterRail({
  active,
  onSelect,
}: {
  active: SellerProductsDataState["filter"];
  onSelect: SellerProductsDataState["setFilter"];
}) {
  const filters = Object.entries(SELLER_PRODUCT_FILTER_LABELS) as Array<
    [SellerProductsDataState["filter"], string]
  >;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
      {filters.map(([id, label]) => {
        const selected = active === id;
        return (
          <Pressable
            key={id}
            style={[styles.filterChip, selected ? styles.filterChipActive : null]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(id)}
          >
            <Text style={[styles.filterLabel, selected ? styles.filterLabelActive : null]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SellerProductsExperience({ state }: Props) {
  const fade = useFadeIn(280);
  const commerce = getCommerceUseCases();
  const [sortOpen, setSortOpen] = useState(false);
  const [menuProduct, setMenuProduct] = useState<SellerOperationalProductView | null>(null);

  const actionCenter = useSellerActionCenter({
    onWorkspaceRefresh: state.refresh,
    onTelemetry: (event, payload) => {
      commerce.trackScreenEvent({
        screen: "seller_products",
        event,
        errorCode: payload?.taskId ? String(payload.taskId) : undefined,
      });
      if (event === "seller_action_success") {
        const kind = payload?.actionKind;
        if (kind === "update_stock") {
          commerce.trackScreenEvent({ screen: "seller_products", event: "seller_stock_updated" });
        } else if (kind === "publish_product") {
          commerce.trackScreenEvent({ screen: "seller_products", event: "seller_product_published" });
        } else if (kind === "hide_product") {
          commerce.trackScreenEvent({ screen: "seller_products", event: "seller_product_hidden" });
        } else if (kind === "fix_moderation") {
          commerce.trackScreenEvent({ screen: "seller_products", event: "seller_moderation_fix_opened" });
        }
      }
    },
  });

  const openProduct = useCallback(
    (product: SellerOperationalProductView) => {
      commerce.trackScreenEvent({
        screen: "seller_products",
        event: "seller_product_opened",
        errorCode: product.id,
      });
      router.push(`/seller/product/${product.id}`);
    },
    [commerce],
  );

  const runAction = useCallback(
    (product: SellerOperationalProductView, actionKind: SellerActionKind) => {
      commerce.trackScreenEvent({
        screen: "seller_products",
        event: "seller_product_action_opened",
        errorCode: actionKind,
      });
      actionCenter.openTask(productToActionTask(product, actionKind));
    },
    [actionCenter, commerce],
  );

  const menuActions = useMemo(
    () => (menuProduct ? resolveProductMenuActions(menuProduct) : []),
    [menuProduct],
  );

  if (!state.sellerCapable) {
    return (
      <EmptyState preset="products" actionLabel="В профиль" onAction={() => router.push("/(tabs)/profile")} />
    );
  }

  if (state.loading && state.items.length === 0) {
    return (
      <PageContainer style={styles.container}>
        <HomeSectionSkeleton />
        <HomeSectionSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer style={styles.container}>
      <Animated.View style={{ opacity: fade, flex: 1 }}>
        <FlatList
          data={state.items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={() => void state.refresh()} />}
          onEndReached={() => void state.loadMore()}
          onEndReachedThreshold={0.4}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <Text style={styles.screenTitle}>Товары</Text>
              <Text style={styles.screenSubtitle}>Операционный каталог — статус, остатки, модерация</Text>
              <SecondaryButton label="Создать товар" onPress={() => router.push("/seller/product/new")} />

              <ActionResultBanner
                result={actionCenter.result}
                onDismiss={actionCenter.dismissResult}
                onUndo={actionCenter.undo}
                undoLoading={actionCenter.executing}
              />

              {state.offline || state.fromCache ? (
                <View style={styles.offlineBanner}>
                  <Text style={styles.offlineText}>
                    {state.offline
                      ? "Оффлайн — показан сохранённый ассортимент"
                      : `Кэш от ${state.cacheSavedAt ? new Date(state.cacheSavedAt).toLocaleString("ru-RU") : "—"}`}
                  </Text>
                  {!state.offline ? (
                    <SecondaryButton label="Обновить" onPress={() => void state.retry()} />
                  ) : null}
                </View>
              ) : null}

              {state.error ? (
                <SectionErrorCard message={state.error} onRetry={() => void state.retry()} />
              ) : null}

              <SummaryLane summary={state.summary} activeFilter={state.filter} onSelect={state.setFilter} />

              <CommerceSearchBar
                placeholder="Название, SKU или артикул"
                value={state.query}
                onChangeText={state.setQuery}
                onClear={state.clearQuery}
              />

              {state.recentSearches.length > 0 && !state.query ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
                  {state.recentSearches.map((term) => (
                    <Pressable key={term} style={styles.recentChip} onPress={() => state.applyRecentSearch(term)}>
                      <Text style={styles.recentText}>{term}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}

              <View style={styles.toolbar}>
                <FilterRail active={state.filter} onSelect={state.setFilter} />
                <Pressable style={styles.sortBtn} onPress={() => setSortOpen(true)} accessibilityRole="button">
                  <Text style={styles.sortBtnText}>Сортировка</Text>
                </Pressable>
              </View>

              <Text style={styles.countLabel}>
                {state.total > 0 ? `${state.total} товар(ов)` : "Нет товаров по фильтру"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <MemoCard item={item} onOpen={openProduct} onMenu={(product) => setMenuProduct(product)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={
            state.loadingMore ? (
              <View style={styles.footerLoader}>
                <HomeSectionSkeleton />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !state.loading ? (
              <EmptyState preset="products" actionLabel="Обновить" onAction={() => void state.refresh()} />
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      </Animated.View>

      <SellerProductSortSheet
        visible={sortOpen}
        sort={state.sort}
        onSelect={state.setSort}
        onClose={() => setSortOpen(false)}
      />

      <SellerProductActionsSheet
        visible={Boolean(menuProduct)}
        title={menuProduct?.title ?? ""}
        actions={menuActions}
        onClose={() => setMenuProduct(null)}
        onSelect={(action) => {
          if (menuProduct) runAction(menuProduct, action);
        }}
      />

      <SellerActionSheet
        task={actionCenter.activeTask}
        visible={Boolean(actionCenter.activeTask)}
        loading={actionCenter.executing}
        onClose={actionCenter.closeSheet}
        onExecute={(values) => void actionCenter.execute(values)}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  headerBlock: { gap: spacing.md, marginBottom: spacing.md },
  screenTitle: { ...typography.h2, color: text.primary, fontWeight: "700" },
  screenSubtitle: { ...typography.bodySmall, color: text.muted },
  offlineBanner: {
    backgroundColor: semantic.warningSoft,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: semantic.warning,
  },
  offlineText: { ...typography.bodySmall, color: text.primary },
  summaryRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: surface.backgroundMuted,
    borderWidth: 1,
    borderColor: border.default,
  },
  summaryChipActive: { backgroundColor: brand.primarySoft, borderColor: brand.primary },
  summaryLabel: { ...typography.caption, color: text.secondary, fontWeight: "600" },
  summaryLabelActive: { color: brand.primary },
  recentRow: { gap: spacing.sm },
  recentChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: surface.backgroundMuted,
  },
  recentText: { ...typography.caption, color: text.secondary },
  toolbar: { gap: spacing.sm },
  filterRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  filterChip: {
    paddingHorizontal: spacing.md,
    minHeight: layout.buttonHeight,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.default,
  },
  filterChipActive: { backgroundColor: brand.primarySoft, borderColor: brand.primary },
  filterLabel: { ...typography.caption, color: text.secondary, fontWeight: "600" },
  filterLabelActive: { color: brand.primary },
  sortBtn: {
    alignSelf: "flex-start",
    minHeight: layout.buttonHeight,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  sortBtnText: { ...typography.bodySmall, color: brand.primary, fontWeight: "600" },
  countLabel: { ...typography.caption, color: text.muted },
  separator: { height: spacing.sm },
  listContent: { paddingBottom: spacing.xxl },
  footerLoader: { paddingVertical: spacing.md },
});
