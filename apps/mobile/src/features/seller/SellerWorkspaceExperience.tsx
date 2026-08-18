import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CommerceSectionHeader } from "../../design-system/components/CommerceSectionHeader";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { SellerHomeHeader } from "../../design-system/components/SellerHomeHeader";
import { SecondaryButton } from "../../design-system/forms/buttons";
import { EmptyState, HomeSectionSkeleton } from "../../design-system/feedback/States";
import { PageScroll } from "../../design-system/layout/ScreenLayout";
import { ShimmerBlock } from "../../design-system/primitives/Shimmer";
import { Badge } from "../../design-system/primitives/Badge";
import { brand, border, semantic, surface, text } from "../../design-system/tokens/colors";
import { layout } from "../../design-system/tokens/layout";
import { radii } from "../../design-system/tokens/radius";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { getCommerceUseCases } from "../../composition/commerce-container";
import { useFadeIn } from "../../hooks/useFadeIn";
import type { SellerWorkspaceItemView, SellerWorkspaceSection } from "./seller-view";
import { SELLER_WORKSPACE_SECTION_LABELS, formatActivityTime } from "./seller-view";
import type { SellerHomeDataState } from "./useSellerHomeData";

type Props = {
  state: SellerHomeDataState;
};

const SECTION_ORDER: SellerWorkspaceSection[] = [
  "urgent",
  "todays_work",
  "quick_resume",
  "recent_drafts",
  "pending_publications",
  "low_stock",
  "awaiting_shipment",
  "customer_replies",
  "financial_actions",
  "completed_today",
];

const PRIORITY_LABELS = {
  urgent: "Срочно",
  important: "Важно",
  routine: "Планово",
  completed: "Завершено",
} as const;

const MemoTaskRow = memo(WorkspaceTaskRow);

function WorkspaceSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <ShimmerBlock height={72} width="100%" />
      <ShimmerBlock height={48} width="100%" />
      <HomeSectionSkeleton />
      <HomeSectionSkeleton />
    </View>
  );
}

function PriorityLane({
  counts,
  active,
  onSelect,
}: {
  counts: { urgent: number; important: number; routine: number; completed: number };
  active: keyof typeof PRIORITY_LABELS | "all";
  onSelect: (priority: keyof typeof PRIORITY_LABELS | "all") => void;
}) {
  const lanes = [
    { key: "urgent" as const, count: counts.urgent, tone: "danger" as const },
    { key: "important" as const, count: counts.important, tone: "warning" as const },
    { key: "routine" as const, count: counts.routine, tone: "neutral" as const },
    { key: "completed" as const, count: counts.completed, tone: "success" as const },
  ];

  return (
    <View style={styles.priorityLane} accessibilityRole="tablist">
      {lanes.map((lane) => {
        const selected = active === lane.key;
        return (
          <Pressable
            key={lane.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${PRIORITY_LABELS[lane.key]}, ${lane.count}`}
            onPress={() => onSelect(lane.key)}
            style={[styles.priorityChip, selected ? styles.priorityChipActive : null]}
          >
            <Text style={[styles.priorityLabel, selected ? styles.priorityLabelActive : null]}>
              {PRIORITY_LABELS[lane.key]}
            </Text>
            <Badge label={String(lane.count)} tone={lane.tone} />
          </Pressable>
        );
      })}
    </View>
  );
}

function WorkspaceTaskRow({
  item,
  onPress,
}: {
  item: SellerWorkspaceItemView;
  onPress: (item: SellerWorkspaceItemView) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.subtitle ?? ""}`}
      onPress={() => onPress(item)}
      style={styles.taskRow}
    >
      <View style={styles.taskMain}>
        <Text style={styles.taskTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text style={styles.taskSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
        {item.completedAt ? (
          <Text style={styles.taskTime}>{formatActivityTime(item.completedAt)}</Text>
        ) : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={text.muted} />
    </Pressable>
  );
}

function WorkspaceSectionBlock({
  section,
  items,
  loading,
  error,
  onRetry,
  onTaskPress,
  fade,
}: {
  section: SellerWorkspaceSection;
  items: SellerWorkspaceItemView[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onTaskPress: (item: SellerWorkspaceItemView) => void;
  fade: Animated.Value;
}) {
  if (!loading && items.length === 0 && !error) return null;

  return (
    <Animated.View style={[styles.section, { opacity: fade }]}>
      <CommerceSectionHeader title={SELLER_WORKSPACE_SECTION_LABELS[section]} />
      {loading ? <HomeSectionSkeleton /> : null}
      {error ? <SectionErrorCard message={error} onRetry={onRetry} /> : null}
      {!loading && !error && items.length > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          initialNumToRender={6}
          renderItem={({ item }) => <MemoTaskRow item={item} onPress={onTaskPress} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : null}
    </Animated.View>
  );
}

export function SellerWorkspaceExperience({ state }: Props) {
  const fade = useFadeIn(280);
  const commerce = getCommerceUseCases();
  const { offline, sellerCapable, dashboard, refreshing, refresh, retryDashboard } = state;
  const data = dashboard.data;
  const [priorityFilter, setPriorityFilter] = useState<keyof typeof PRIORITY_LABELS | "all">("all");

  const navigateForTask = useCallback((item: SellerWorkspaceItemView) => {
    if (item.action === "orders") router.push("/(tabs)/seller-sales");
    else if (item.action === "products") router.push("/(tabs)/seller-products");
    else if (item.action === "wallet") router.push("/(tabs)/wallet");
    else router.push("/(tabs)/profile");
  }, []);

  const onTaskPress = useCallback(
    (item: SellerWorkspaceItemView) => {
      if (item.section === "quick_resume") {
        commerce.trackScreenEvent({
          screen: "seller_home",
          event: "seller_resume_clicked",
          errorCode: item.resumeKey ?? item.id,
        });
      } else if (item.priority === "completed") {
        commerce.trackScreenEvent({
          screen: "seller_home",
          event: "seller_task_completed",
          errorCode: item.id,
        });
      } else {
        commerce.trackScreenEvent({
          screen: "seller_home",
          event: "seller_task_completed",
          errorCode: item.id,
        });
      }
      navigateForTask(item);
    },
    [commerce, navigateForTask],
  );

  const onPrioritySelect = useCallback(
    (priority: keyof typeof PRIORITY_LABELS | "all") => {
      setPriorityFilter(priority);
      commerce.trackScreenEvent({
        screen: "seller_home",
        event: "seller_priority_changed",
        errorCode: priority,
      });
    },
    [commerce],
  );

  const filteredSections = useMemo(() => {
    if (!data?.workspace) return [] as Array<{ section: SellerWorkspaceSection; items: SellerWorkspaceItemView[] }>;
    return SECTION_ORDER.map((section) => {
      const items = data.workspace.sections[section].filter(
        (item) => priorityFilter === "all" || item.priority === priorityFilter,
      );
      return { section, items };
    }).filter((entry) => entry.items.length > 0 || dashboard.loading || dashboard.error);
  }, [data?.workspace, dashboard.error, dashboard.loading, priorityFilter]);

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
        description="Войдите под аккаунтом продавца, чтобы открыть рабочее пространство."
        actionLabel="В профиль"
        onAction={() => router.push("/(tabs)/profile")}
      />
    );
  }

  if (dashboard.loading && !data) {
    return (
      <PageScroll>
        <WorkspaceSkeleton />
      </PageScroll>
    );
  }

  const workspace = data?.workspace;
  const hasWorkspaceItems = (workspace?.items.length ?? 0) > 0;

  return (
    <PageScroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
      <Animated.View style={{ opacity: fade, gap: spacing.lg }}>
        {headerProps ? <SellerHomeHeader header={headerProps} /> : null}

        <CommerceSectionHeader title="Рабочее пространство" subtitle="Задачи из заказов, товаров, кошелька и уведомлений" />

        {offline ? (
          <View style={styles.offlineBanner} accessibilityRole="text">
            <Text style={styles.offlineText}>Оффлайн — показаны сохранённые задачи</Text>
            <SecondaryButton label="Повторить" onPress={() => void retryDashboard()} />
          </View>
        ) : null}

        {dashboard.error ? <SectionErrorCard message={dashboard.error} onRetry={() => void retryDashboard()} /> : null}

        {workspace ? (
          <PriorityLane counts={workspace.counts} active={priorityFilter} onSelect={onPrioritySelect} />
        ) : null}

        {!dashboard.loading && !dashboard.error && !hasWorkspaceItems ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Задач пока нет</Text>
            <Text style={styles.emptyText}>Когда появятся заказы, черновики или сообщения покупателей, они отобразятся здесь.</Text>
          </View>
        ) : null}

        {filteredSections.map(({ section, items }) => (
          <WorkspaceSectionBlock
            key={section}
            section={section}
            items={items}
            loading={dashboard.loading}
            error={dashboard.error}
            onRetry={() => void retryDashboard()}
            onTaskPress={onTaskPress}
            fade={fade}
          />
        ))}
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
  priorityLane: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  priorityChip: {
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
  priorityChipActive: { backgroundColor: brand.primarySoft, borderColor: brand.primary },
  priorityLabel: { ...typography.caption, color: text.secondary, fontWeight: "600" },
  priorityLabelActive: { color: brand.primary },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: layout.buttonHeight,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.default,
  },
  taskMain: { flex: 1, gap: 2 },
  taskTitle: { ...typography.body, color: text.primary, fontWeight: "600" },
  taskSubtitle: { ...typography.caption, color: text.muted },
  taskTime: { ...typography.caption, color: text.secondary },
  separator: { height: spacing.sm },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: surface.backgroundMuted,
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.body, color: text.primary, fontWeight: "600", textAlign: "center" },
  emptyText: { ...typography.bodySmall, color: text.muted, textAlign: "center" },
});
