import { router } from "expo-router";
import { memo, useCallback } from "react";
import { Animated, RefreshControl, StyleSheet, Text, View } from "react-native";

import { CommerceSectionHeader } from "../../design-system/components/CommerceSectionHeader";
import { SectionErrorCard } from "../../design-system/components/SectionErrorCard";
import { EmptyState, HomeSectionSkeleton } from "../../design-system/feedback/States";
import { PageScroll } from "../../design-system/layout/ScreenLayout";
import { ShimmerBlock } from "../../design-system/primitives/Shimmer";
import { border, surface, text } from "../../design-system/tokens/colors";
import { layout } from "../../design-system/tokens/layout";
import { spacing } from "../../design-system/tokens/spacing";
import { typography } from "../../design-system/tokens/typography";
import { getCommerceUseCases } from "../../composition/commerce-container";
import { useFadeIn } from "../../hooks/useFadeIn";
import { ActionResultBanner } from "./action-center/ActionResultBanner";
import { SellerActionSheet } from "./action-center/SellerActionSheet";
import { useSellerActionCenter } from "./action-center/useSellerActionCenter";
import { SellerInsightCard, SellerRevenueTrendCard } from "./intelligence/SellerInsightCard";
import {
  SELLER_INTELLIGENCE_SECTION_ORDER,
  insightToWorkspaceTask,
  type SellerInsightView,
  type SellerIntelligenceSectionId,
} from "./intelligence/seller-intelligence-view";
import type { SellerIntelligenceDataState } from "./intelligence/useSellerIntelligenceData";

type Props = {
  state: SellerIntelligenceDataState;
};

const MemoInsightCard = memo(SellerInsightCard);

function IntelligenceSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <ShimmerBlock height={72} width="100%" />
      <HomeSectionSkeleton />
      <HomeSectionSkeleton />
    </View>
  );
}

function IntelligenceSectionBlock({
  sectionId,
  title,
  insights,
  loading,
  error,
  onRetry,
  onInsightPress,
  fade,
  revenueTrend,
}: {
  sectionId: SellerIntelligenceSectionId;
  title: string;
  insights: SellerInsightView[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onInsightPress: (insight: SellerInsightView) => void;
  fade: Animated.Value;
  revenueTrend?: Array<{ date: string; revenue: number; orders: number }> | null;
}) {
  if (!loading && insights.length === 0 && !error && sectionId !== "revenue_trend") return null;
  if (
    sectionId === "revenue_trend" &&
    !loading &&
    !error &&
    (!revenueTrend || revenueTrend.every((p) => p.revenue === 0 && p.orders === 0))
  ) {
    return null;
  }

  return (
    <Animated.View style={[styles.section, { opacity: fade }]}>
      <CommerceSectionHeader title={title} subtitle="Только данные из вашего магазина" />
      {loading ? <HomeSectionSkeleton /> : null}
      {error ? <SectionErrorCard message={error} onRetry={onRetry} /> : null}
      {!loading && !error ? (
        <>
          {sectionId === "revenue_trend" && revenueTrend ? <SellerRevenueTrendCard points={revenueTrend} /> : null}
          {insights.map((insight) => (
            <MemoInsightCard key={insight.id} insight={insight} onPressCta={() => onInsightPress(insight)} />
          ))}
        </>
      ) : null}
    </Animated.View>
  );
}

export function SellerIntelligenceExperience({ state }: Props) {
  const fade = useFadeIn(280);
  const commerce = getCommerceUseCases();
  const { offline, sellerCapable, intelligence, refreshing, refresh, retryIntelligence } = state;
  const data = intelligence.data;

  const trackTelemetry = useCallback(
    (event: string, payload?: Record<string, unknown>) => {
      commerce.trackScreenEvent({
        screen: "seller_intelligence",
        event,
        errorCode: payload?.insightId ? String(payload.insightId) : undefined,
      });
    },
    [commerce],
  );

  const actionCenter = useSellerActionCenter({
    onWorkspaceRefresh: retryIntelligence,
    onTelemetry: trackTelemetry,
  });

  const onInsightPress = useCallback(
    (insight: SellerInsightView) => {
      trackTelemetry("seller_intelligence_cta_clicked", { insightId: insight.id });

      if (insight.cta.actionKind) {
        actionCenter.openTask(insightToWorkspaceTask(insight));
        return;
      }

      if (insight.cta.entityId && insight.cta.route === "products") {
        router.push(`/seller/product/${insight.cta.entityId}`);
        return;
      }

      if (insight.cta.route === "orders") {
        router.push("/(tabs)/seller-sales");
        return;
      }
      if (insight.cta.route === "products") {
        router.push("/(tabs)/seller-products");
        return;
      }
      if (insight.cta.route === "wallet") {
        router.push("/(tabs)/wallet");
        return;
      }
      if (insight.cta.route === "profile") {
        router.push("/(tabs)/profile");
      }
    },
    [actionCenter, trackTelemetry],
  );

  if (!sellerCapable) {
    return (
      <PageScroll>
        <EmptyState
          title="Нет доступа"
          description="Раздел аналитики доступен продавцам"
          actionLabel="В профиль"
          onAction={() => router.push("/(tabs)/profile")}
        />
      </PageScroll>
    );
  }

  const hasSections = (data?.sections.length ?? 0) > 0;
  const showEmpty = !intelligence.loading && !intelligence.error && !hasSections;

  return (
    <>
      <PageScroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Центр аналитики</Text>
          <Text style={styles.screenSubtitle}>
            {offline ? "Оффлайн · сохранённый снимок" : "Решения на основе реальных данных"}
          </Text>
        </View>

        {intelligence.loading && !data ? <IntelligenceSkeleton /> : null}
        {intelligence.error ? (
          <SectionErrorCard message={intelligence.error} onRetry={() => void retryIntelligence()} />
        ) : null}

        {showEmpty ? (
          <EmptyState
            title="Нет данных для аналитики"
            description="Когда появятся заказы и продажи, здесь будут показаны insights"
          />
        ) : null}

        {data
          ? SELLER_INTELLIGENCE_SECTION_ORDER.map((sectionId) => {
              const section = data.sectionMap[sectionId];
              if (!section && sectionId !== "revenue_trend") return null;
              return (
                <IntelligenceSectionBlock
                  key={sectionId}
                  sectionId={sectionId}
                  title={section?.title ?? "Динамика выручки"}
                  insights={[...(section?.insights ?? [])]}
                  loading={intelligence.loading}
                  error={null}
                  fade={fade}
                  onInsightPress={onInsightPress}
                  revenueTrend={sectionId === "revenue_trend" ? data.revenueTrend : null}
                />
              );
            })
          : null}
      </PageScroll>

      <ActionResultBanner
        result={actionCenter.result}
        onDismiss={actionCenter.dismissResult}
        onUndo={actionCenter.result.undo ? () => void actionCenter.undo() : undefined}
        undoLoading={actionCenter.executing}
      />

      <SellerActionSheet
        task={actionCenter.activeTask}
        visible={Boolean(actionCenter.activeTask)}
        loading={actionCenter.executing}
        onClose={actionCenter.closeSheet}
        onExecute={(values) => void actionCenter.execute(values)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: layout.tabBarHeight + spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  screenTitle: {
    ...typography.title,
    color: text.primary,
  },
  screenSubtitle: {
    ...typography.bodySmall,
    color: text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  skeletonWrap: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
});
