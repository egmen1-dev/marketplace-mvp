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

import { SellerOperationalOrderCard } from "../../design-system/cards/SellerOperationalOrderCard";
import { CommerceSearchBar } from "../../design-system/commerce/CommerceSearchBar";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
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
import { ActionResultBanner } from "../seller/action-center/ActionResultBanner";
import { SellerActionSheet } from "../seller/action-center/SellerActionSheet";
import { useSellerActionCenter } from "../seller/action-center/useSellerActionCenter";
import { SellerOrderActionsSheet } from "../seller/orders/SellerOrderActionsSheet";
import { resolveOrderMenuActions } from "../seller/orders/seller-order-actions";
import {
  SELLER_ORDER_FILTER_LABELS,
  SELLER_ORDER_SUMMARY_KEYS,
  orderToActionTask,
  type SellerOperationalOrderView,
} from "../seller/orders/seller-orders-view";
import type { SellerSalesState } from "./useSellerSalesData";

type Props = { state: SellerSalesState };

const MemoCard = memo(function OrderRow({
  item,
  onOpen,
  onMenu,
}: {
  item: SellerOperationalOrderView;
  onOpen: (item: SellerOperationalOrderView) => void;
  onMenu: (item: SellerOperationalOrderView) => void;
}) {
  return (
    <SellerOperationalOrderCard order={item} onPress={() => onOpen(item)} onMenuPress={() => onMenu(item)} />
  );
});

function SummaryLane({
  summary,
  activeFilter,
  onSelect,
}: {
  summary: SellerSalesState["summary"];
  activeFilter: SellerSalesState["filter"];
  onSelect: SellerSalesState["setFilter"];
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
      {SELLER_ORDER_SUMMARY_KEYS.map(({ key, filter, label }) => (
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
  active: SellerSalesState["filter"];
  onSelect: SellerSalesState["setFilter"];
}) {
  const filters = Object.entries(SELLER_ORDER_FILTER_LABELS) as Array<[SellerSalesState["filter"], string]>;
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

export function SellerSalesExperience({ state }: Props) {
  const fade = useFadeIn(280);
  const commerce = getCommerceUseCases();
  const [menuOrder, setMenuOrder] = useState<SellerOperationalOrderView | null>(null);

  const actionCenter = useSellerActionCenter({
    onWorkspaceRefresh: state.refresh,
    onTelemetry: (event, payload) => {
      commerce.trackScreenEvent({
        screen: "seller_sales",
        event,
        errorCode: payload?.taskId ? String(payload.taskId) : undefined,
      });
      if (event === "seller_action_success") {
        const kind = payload?.actionKind;
        if (kind === "confirm_order") {
          commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_order_confirmed" });
        } else if (kind === "ship_order") {
          commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_order_shipped" });
        } else if (kind === "ready_for_shipment") {
          commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_order_ready_for_shipment" });
        } else if (kind === "ready_for_pickup") {
          commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_order_ready_for_pickup" });
        } else if (kind === "mark_picked_up") {
          commerce.trackScreenEvent({ screen: "seller_sales", event: "seller_order_picked_up" });
        }
      }
    },
  });

  const openOrder = useCallback(
    (order: SellerOperationalOrderView) => {
      commerce.trackScreenEvent({
        screen: "seller_sales",
        event: "seller_order_opened",
        errorCode: order.id,
      });
      router.push(`/seller/order/${order.id}`);
    },
    [commerce],
  );

  const runAction = useCallback(
    (order: SellerOperationalOrderView, actionKind: SellerActionKind) => {
      commerce.trackScreenEvent({
        screen: "seller_sales",
        event: "seller_order_action_opened",
        errorCode: actionKind,
      });
      actionCenter.openTask(orderToActionTask(order, actionKind));
    },
    [actionCenter, commerce],
  );

  const menuActions = useMemo(() => (menuOrder ? resolveOrderMenuActions(menuOrder) : []), [menuOrder]);

  if (!state.sellerCapable) {
    return (
      <EmptyState preset="sales" actionLabel="В профиль" onAction={() => router.push("/(tabs)/profile")} />
    );
  }

  if (state.loading && state.orders.length === 0) {
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
          data={state.orders}
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
              <Text style={styles.screenTitle}>Заказы</Text>
              <Text style={styles.screenSubtitle}>Очередь продаж — подтверждение, сборка, отправка и выдача</Text>

              {state.summary.overdue > 0 ? (
                <View style={styles.overdueBanner}>
                  <Text style={styles.overdueTitle}>{state.summary.overdue} заказ(ов) просрочено</Text>
                  <SecondaryButton label="Открыть просроченные" onPress={() => state.setFilter("overdue")} />
                </View>
              ) : null}

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
                      ? "Оффлайн — показана сохранённая очередь заказов"
                      : `Кэш от ${state.cacheSavedAt ? new Date(state.cacheSavedAt).toLocaleString("ru-RU") : "—"}`}
                  </Text>
                  {!state.offline ? <SecondaryButton label="Обновить" onPress={() => void state.retry()} /> : null}
                </View>
              ) : null}

              {state.error ? <SectionErrorCard message={state.error} onRetry={() => void state.retry()} /> : null}

              <SummaryLane summary={state.summary} activeFilter={state.filter} onSelect={state.setFilter} />

              <CommerceSearchBar
                placeholder="Номер заказа, покупатель или товар"
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

              <FilterRail active={state.filter} onSelect={state.setFilter} />

              <Text style={styles.countLabel}>
                {state.total > 0 ? `${state.total} заказ(ов)` : "Нет заказов по фильтру"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <MemoCard item={item} onOpen={openOrder} onMenu={(order) => setMenuOrder(order)} />
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
              <EmptyState preset="sales" actionLabel="Обновить" onAction={() => void state.refresh()} />
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      </Animated.View>

      <SellerOrderActionsSheet
        visible={Boolean(menuOrder)}
        title={menuOrder ? `№ ${menuOrder.orderNumber}` : ""}
        actions={menuActions}
        onClose={() => setMenuOrder(null)}
        onSelect={(action) => {
          if (menuOrder) runAction(menuOrder, action);
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
  overdueBanner: {
    backgroundColor: semantic.dangerSoft,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: semantic.danger,
  },
  overdueTitle: { ...typography.bodySmall, color: semantic.danger, fontWeight: "700" },
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
  countLabel: { ...typography.caption, color: text.muted },
  separator: { height: spacing.sm },
  listContent: { paddingBottom: spacing.xxl },
  footerLoader: { paddingVertical: spacing.md },
});
