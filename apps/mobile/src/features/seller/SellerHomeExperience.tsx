import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { memo, useCallback, useMemo } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MetricCard, WalletCard } from "../../design-system/cards/CommerceCards";
import { CommerceSectionHeader } from "../../design-system/components/CommerceSectionHeader";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { SellerHomeHeader } from "../../design-system/components/SellerHomeHeader";
import { PrimaryButton, SecondaryButton } from "../../design-system/forms/buttons";
import { EmptyState, HomeSectionSkeleton } from "../../design-system/feedback/States";
import { PageScroll } from "../../design-system/layout/ScreenLayout";
import { ShimmerBlock } from "../../design-system/primitives/Shimmer";
import { brand, border, semantic, surface, text } from "../../design-system/tokens/colors";
import { layout } from "../../design-system/tokens/layout";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { getCommerceUseCases } from "../../composition/commerce-container";
import { useFadeIn } from "../../hooks/useFadeIn";
import { formatPrice } from "../../utils/format";
import type {
  SellerHomeActivityView,
  SellerHomeNotificationView,
  SellerHomeTaskView,
  SellerHomeTodayCardView,
} from "./seller-view";
import { formatActivityTime } from "./seller-view";
import type { SellerHomeDataState } from "./useSellerHomeData";

type Props = {
  state: SellerHomeDataState;
};

const MemoMetricCard = memo(MetricCard);

function SellerHomeSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <ShimmerBlock height={72} width="100%" />
      <ShimmerBlock height={120} width="100%" />
      <HomeSectionSkeleton />
      <HomeSectionSkeleton />
    </View>
  );
}

function TodaySummarySection({
  cards,
  loading,
  error,
  onRetry,
  fade,
}: {
  cards: SellerHomeTodayCardView[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  fade: Animated.Value;
}) {
  if (!loading && cards.length === 0 && !error) return null;

  return (
    <Animated.View style={[styles.section, { opacity: fade }]}>
      <CommerceSectionHeader title="Сегодня" subtitle="Ключевые показатели дня" />
      {loading ? <HomeSectionSkeleton /> : null}
      {error ? <SectionErrorCard message={error} onRetry={onRetry} /> : null}
      {!loading && !error && cards.length > 0 ? (
        <View style={styles.todayGrid}>
          {cards.map((card) => (
            <View key={card.id} style={styles.todayCardWrap}>
              <MemoMetricCard label={card.label} value={card.value} tone={card.tone} />
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

function RevenueSection({
  revenue,
  loading,
  error,
  onRetry,
  fade,
}: {
  revenue: { today: number; week: number; month: number; averageOrder: number | null } | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  fade: Animated.Value;
}) {
  if (!loading && !revenue && !error) return null;

  return (
    <Animated.View style={[styles.section, { opacity: fade }]}>
      <CommerceSectionHeader title="Выручка" subtitle="Фактические продажи" />
      {loading ? <HomeSectionSkeleton /> : null}
      {error ? <SectionErrorCard message={error} onRetry={onRetry} /> : null}
      {!loading && !error && revenue ? (
        <View style={styles.metricsGrid}>
          <MemoMetricCard label="Сегодня" value={formatPrice(revenue.today)} tone="success" />
          <MemoMetricCard label="Неделя" value={formatPrice(revenue.week)} tone="neutral" />
          <MemoMetricCard label="Месяц" value={formatPrice(revenue.month)} tone="neutral" />
          {revenue.averageOrder !== null ? (
            <MemoMetricCard label="Средний чек" value={formatPrice(revenue.averageOrder)} tone="neutral" />
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

function OrderBucketRow({
  label,
  value,
  tone,
  onPress,
}: {
  label: string;
  value: number;
  tone: "neutral" | "warning" | "success";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={styles.bucketRow}
    >
      <Text style={styles.bucketLabel}>{label}</Text>
      <View style={styles.bucketValueWrap}>
        <Text style={styles.bucketValue}>{value}</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={text.muted} />
      </View>
    </Pressable>
  );
}

function OrdersSection({
  buckets,
  loading,
  error,
  onRetry,
  onOpenOrders,
  fade,
}: {
  buckets: { new: number; processing: number; awaitingShipment: number; completed: number } | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onOpenOrders: () => void;
  fade: Animated.Value;
}) {
  if (!loading && !buckets && !error) return null;

  return (
    <Animated.View style={[styles.section, { opacity: fade }]}>
      <CommerceSectionHeader title="Заказы" subtitle="По статусам обработки" onAction={onOpenOrders} actionLabel="Все" />
      {loading ? <HomeSectionSkeleton /> : null}
      {error ? <SectionErrorCard message={error} onRetry={onRetry} /> : null}
      {!loading && !error && buckets ? (
        <View style={styles.bucketCard}>
          <OrderBucketRow label="Новые" value={buckets.new} tone="warning" onPress={onOpenOrders} />
          <OrderBucketRow label="В обработке" value={buckets.processing} tone="neutral" onPress={onOpenOrders} />
          <OrderBucketRow label="Ожидают отправки" value={buckets.awaitingShipment} tone="warning" onPress={onOpenOrders} />
          <OrderBucketRow label="Завершённые" value={buckets.completed} tone="success" onPress={onOpenOrders} />
        </View>
      ) : null}
    </Animated.View>
  );
}

function ProductsSection({
  buckets,
  loading,
  error,
  onRetry,
  onManageProducts,
  fade,
}: {
  buckets: {
    active: number;
    outOfStock: number;
    drafts: number;
    hidden: number;
    lowStock: number | null;
  } | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onManageProducts: () => void;
  fade: Animated.Value;
}) {
  if (!loading && !buckets && !error) return null;

  return (
    <Animated.View style={[styles.section, { opacity: fade }]}>
      <CommerceSectionHeader title="Товары" subtitle="Состояние каталога" onAction={onManageProducts} actionLabel="Управление" />
      {loading ? <HomeSectionSkeleton /> : null}
      {error ? <SectionErrorCard message={error} onRetry={onRetry} /> : null}
      {!loading && !error && buckets ? (
        <>
          <View style={styles.metricsGrid}>
            <MemoMetricCard label="Активные" value={String(buckets.active)} tone="success" />
            <MemoMetricCard label="Нет в наличии" value={String(buckets.outOfStock)} tone={buckets.outOfStock > 0 ? "warning" : "neutral"} />
            <MemoMetricCard label="Черновики" value={String(buckets.drafts)} tone="neutral" />
            <MemoMetricCard label="Скрытые" value={String(buckets.hidden)} tone="neutral" />
            {buckets.lowStock !== null ? (
              <MemoMetricCard label="Низкий остаток" value={String(buckets.lowStock)} tone="warning" />
            ) : null}
          </View>
          <PrimaryButton label="Управлять товарами" fullWidth onPress={onManageProducts} />
        </>
      ) : null}
    </Animated.View>
  );
}

function TasksSection({
  tasks,
  onTaskPress,
  fade,
}: {
  tasks: SellerHomeTaskView[];
  onTaskPress: (task: SellerHomeTaskView) => void;
  fade: Animated.Value;
}) {
  if (tasks.length === 0) return null;

  return (
    <Animated.View style={[styles.section, { opacity: fade }]}>
      <CommerceSectionHeader title="Задачи" subtitle="Что сделать сейчас" />
      <View style={styles.taskList}>
        {tasks.map((task) => (
          <Pressable
            key={task.id}
            accessibilityRole="button"
            accessibilityLabel={task.title}
            onPress={() => onTaskPress(task)}
            style={styles.taskRow}
          >
            <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={18} color={brand.primary} />
            <Text style={styles.taskText}>{task.title}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={text.muted} />
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

function NotificationsSection({
  notifications,
  onOpen,
  fade,
}: {
  notifications: SellerHomeNotificationView[];
  onOpen: (notification: SellerHomeNotificationView) => void;
  fade: Animated.Value;
}) {
  return (
    <Animated.View style={[styles.section, { opacity: fade }]}>
      <CommerceSectionHeader title="Уведомления" subtitle="Последние события" />
      {notifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Новых уведомлений нет</Text>
        </View>
      ) : (
        <View style={styles.notificationList}>
          {notifications.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body}`}
              onPress={() => onOpen(item)}
              style={styles.notificationRow}
            >
              <View style={styles.notificationMeta}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.notificationBody} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
              <Text style={styles.notificationTime}>{formatActivityTime(item.createdAt)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

function InsightsSection({
  insights,
  fade,
}: {
  insights: {
    bestSellingCategory: string | null;
    mostViewedProduct: string | null;
    returningCustomersPct: number | null;
  } | null;
  fade: Animated.Value;
}) {
  if (!insights) return null;
  const rows = [
    insights.bestSellingCategory ? { label: "Лучшая категория", value: insights.bestSellingCategory } : null,
    insights.mostViewedProduct ? { label: "Самый просматриваемый", value: insights.mostViewedProduct } : null,
    insights.returningCustomersPct !== null
      ? { label: "Повторные покупатели", value: `${insights.returningCustomersPct}%` }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (rows.length === 0) return null;

  return (
    <Animated.View style={[styles.section, { opacity: fade }]}>
      <CommerceSectionHeader title="Инсайты" subtitle="На основе ваших данных" />
      <View style={styles.insightList}>
        {rows.map((row) => (
          <View key={row.label} style={styles.insightRow}>
            <Text style={styles.insightLabel}>{row.label}</Text>
            <Text style={styles.insightValue} numberOfLines={2}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const QUICK_ACTIONS = [
  { id: "products", label: "Товары", icon: "tag-outline" as const, route: "/(tabs)/seller-products" },
  { id: "orders", label: "Заказы", icon: "clipboard-list-outline" as const, route: "/(tabs)/seller-sales" },
  { id: "analytics", label: "Аналитика", icon: "chart-line" as const, route: "/(tabs)/profile" },
  { id: "wallet", label: "Кошелёк", icon: "wallet-outline" as const, route: "/(tabs)/wallet" },
  { id: "promotion", label: "Продвижение", icon: "bullhorn-outline" as const, route: "/(tabs)/seller-home" },
  { id: "profile", label: "Профиль", icon: "store-outline" as const, route: "/(tabs)/profile" },
] as const;

function QuickActionsSection({ onAction }: { onAction: (id: string, route: string) => void }) {
  return (
    <View style={styles.section}>
      <CommerceSectionHeader title="Быстрые действия" />
      <View style={styles.quickGrid}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => onAction(action.id, action.route)}
            style={styles.quickTile}
          >
            <MaterialCommunityIcons name={action.icon} size={24} color={brand.primary} />
            <Text style={styles.quickLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ActivityListItem({ item }: { item: SellerHomeActivityView }) {
  return (
    <View style={styles.activityRow} accessibilityLabel={`${item.title}. ${item.subtitle}`}>
      <View style={styles.activityDot} />
      <View style={styles.activityMeta}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activitySubtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      <Text style={styles.activityTime}>{formatActivityTime(item.createdAt)}</Text>
    </View>
  );
}

function HistorySection({
  activity,
  ready,
  loading,
  fade,
}: {
  activity: SellerHomeActivityView[];
  ready: boolean;
  loading: boolean;
  fade: Animated.Value;
}) {
  if (loading || !ready) {
    return (
      <Animated.View style={[styles.section, { opacity: fade }]}>
        <CommerceSectionHeader title="История" subtitle="Последняя активность" />
        <HomeSectionSkeleton />
      </Animated.View>
    );
  }

  if (activity.length === 0) return null;

  return (
    <Animated.View style={[styles.section, { opacity: fade }]}>
      <CommerceSectionHeader title="История" subtitle="Последняя активность" />
      <FlatList
        data={activity}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        renderItem={({ item }) => <ActivityListItem item={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </Animated.View>
  );
}

export function SellerHomeExperience({ state }: Props) {
  const fade = useFadeIn(280);
  const commerce = getCommerceUseCases();
  const { offline, sellerCapable, dashboard, historyReady, refreshing, refresh, retryDashboard } = state;
  const data = dashboard.data;

  const trackQuickAction = useCallback(
    (id: string) => {
      commerce.trackScreenEvent({ screen: "seller_home", event: "seller_quick_action", errorCode: id });
    },
    [commerce],
  );

  const openOrders = useCallback(() => {
    commerce.trackScreenEvent({ screen: "seller_home", event: "seller_orders_opened" });
    router.push("/(tabs)/seller-sales");
  }, [commerce]);

  const openProducts = useCallback(() => {
    commerce.trackScreenEvent({ screen: "seller_home", event: "seller_products_opened" });
    router.push("/(tabs)/seller-products");
  }, [commerce]);

  const onTaskPress = useCallback(
    (task: SellerHomeTaskView) => {
      commerce.trackScreenEvent({ screen: "seller_home", event: "seller_task_clicked", errorCode: task.id });
      if (task.action === "orders") router.push("/(tabs)/seller-sales");
      else if (task.action === "products") router.push("/(tabs)/seller-products");
      else if (task.action === "wallet") router.push("/(tabs)/wallet");
      else router.push("/(tabs)/profile");
    },
    [commerce],
  );

  const onNotificationOpen = useCallback(
    (notification: SellerHomeNotificationView) => {
      commerce.trackScreenEvent({
        screen: "seller_home",
        event: "seller_notification_opened",
        errorCode: notification.kind,
      });
      if (notification.kind === "new_order" || notification.kind === "order_cancelled") {
        router.push("/(tabs)/seller-sales");
      } else if (notification.kind === "low_stock") {
        router.push("/(tabs)/seller-products");
      }
    },
    [commerce],
  );

  const onQuickAction = useCallback(
    (id: string, route: string) => {
      trackQuickAction(id);
      if (id === "orders") openOrders();
      else if (id === "products") openProducts();
      else router.push(route as "/(tabs)/profile");
    },
    [openOrders, openProducts, trackQuickAction],
  );

  const sectionError = dashboard.error;
  const sectionLoading = dashboard.loading && !data;

  const headerProps = useMemo(
    () =>
      data?.header
        ? { ...data.header, offline }
        : offline
          ? {
              storeName: "Мой магазин",
              logoUrl: null,
              isVerified: false,
              dateLabel: new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" }),
              offline: true,
            }
          : null,
    [data?.header, offline],
  );

  if (!sellerCapable) {
    return (
      <EmptyState
        title="Режим продавца недоступен"
        description="Войдите под аккаунтом продавца, чтобы открыть кабинет."
        actionLabel="В профиль"
        onAction={() => router.push("/(tabs)/profile")}
      />
    );
  }

  if (sectionLoading) {
    return (
      <PageScroll>
        <SellerHomeSkeleton />
      </PageScroll>
    );
  }

  return (
    <PageScroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
      <Animated.View style={{ opacity: fade, gap: spacing.lg }}>
        {headerProps ? <SellerHomeHeader header={headerProps} /> : null}

        {offline ? (
          <View style={styles.offlineBanner} accessibilityRole="text">
            <Text style={styles.offlineText}>Оффлайн — показаны сохранённые данные</Text>
            <SecondaryButton label="Повторить" onPress={() => void retryDashboard()} />
          </View>
        ) : null}

        <TodaySummarySection
          cards={data?.todayCards ?? []}
          loading={dashboard.loading}
          error={sectionError}
          onRetry={() => void retryDashboard()}
          fade={fade}
        />

        <RevenueSection
          revenue={data?.revenue ?? null}
          loading={dashboard.loading}
          error={sectionError}
          onRetry={() => void retryDashboard()}
          fade={fade}
        />

        <OrdersSection
          buckets={data?.orderBuckets ?? null}
          loading={dashboard.loading}
          error={sectionError}
          onRetry={() => void retryDashboard()}
          onOpenOrders={openOrders}
          fade={fade}
        />

        <ProductsSection
          buckets={data?.productBuckets ?? null}
          loading={dashboard.loading}
          error={sectionError}
          onRetry={() => void retryDashboard()}
          onManageProducts={openProducts}
          fade={fade}
        />

        <TasksSection tasks={data?.tasks ?? []} onTaskPress={onTaskPress} fade={fade} />

        <NotificationsSection notifications={data?.notifications ?? []} onOpen={onNotificationOpen} fade={fade} />

        <InsightsSection insights={data?.insights ?? null} fade={fade} />

        {data?.money ? (
          <View style={styles.section}>
            <CommerceSectionHeader title="Кошелёк" />
            <WalletCard
              balance={data.money.available}
              withdrawable={data.money.available}
              pending={data.money.pending}
            />
          </View>
        ) : null}

        <QuickActionsSection onAction={onQuickAction} />

        <HistorySection
          activity={data?.recentActivity ?? []}
          ready={historyReady}
          loading={dashboard.loading}
          fade={fade}
        />
      </Animated.View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  skeletonWrap: { gap: spacing.lg, paddingVertical: spacing.md },
  offlineBanner: {
    backgroundColor: semantic.warningSoft,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: semantic.warning,
  },
  offlineText: { ...typography.bodySmall, color: text.primary },
  todayGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  todayCardWrap: { width: "47%", minWidth: 148 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  bucketCard: {
    backgroundColor: surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: border.default,
    overflow: "hidden",
  },
  bucketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    minHeight: layout.buttonHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: border.default,
  },
  bucketLabel: { ...typography.body, color: text.primary },
  bucketValueWrap: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  bucketValue: { ...typography.bodySmall, color: text.secondary, fontWeight: "600" },
  taskList: { gap: spacing.sm },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: layout.buttonHeight,
    paddingHorizontal: spacing.md,
    backgroundColor: surface.backgroundMuted,
    borderRadius: radii.md,
  },
  taskText: { ...typography.body, color: text.primary, flex: 1 },
  notificationList: { gap: spacing.sm },
  notificationRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    minHeight: layout.buttonHeight,
    padding: spacing.md,
    backgroundColor: surface.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: border.default,
  },
  notificationMeta: { flex: 1, gap: 2 },
  notificationTitle: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  notificationBody: { ...typography.caption, color: text.muted },
  notificationTime: { ...typography.caption, color: text.muted },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: surface.backgroundMuted,
  },
  emptyText: { ...typography.body, color: text.muted, textAlign: "center" },
  insightList: { gap: spacing.sm },
  insightRow: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: surface.backgroundMuted,
    gap: 4,
  },
  insightLabel: { ...typography.caption, color: text.muted },
  insightValue: { ...typography.body, color: text.primary },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickTile: {
    width: "31%",
    minWidth: 100,
    minHeight: layout.buttonHeight + 12,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.default,
  },
  quickLabel: { ...typography.caption, color: text.primary, textAlign: "center" },
  activityRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: layout.buttonHeight },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: brand.primary },
  activityMeta: { flex: 1, gap: 2 },
  activityTitle: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  activitySubtitle: { ...typography.caption, color: text.muted },
  activityTime: { ...typography.caption, color: text.muted },
  separator: { height: spacing.sm },
});
