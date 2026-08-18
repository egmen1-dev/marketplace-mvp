import { StyleSheet, Text, View } from "react-native";

import { SecondaryButton } from "../../../design-system/forms/buttons";
import { brand, border, surface, text } from "../../../design-system/tokens/colors";
import { radii } from "../../../design-system/tokens/radius";
import { spacing } from "../../../design-system/tokens/spacing";
import { typography } from "../../../design-system/tokens/typography";
import type { SellerInsightView } from "./seller-intelligence-view";

type Props = {
  insight: SellerInsightView;
  onPressCta: () => void;
};

export function SellerInsightCard({ insight, onPressCta }: Props) {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.title}>{insight.title}</Text>

      <View style={styles.evidenceBlock}>
        <Text style={styles.blockLabel}>Доказательства</Text>
        {insight.evidence.map((item: { label: string; value: string }) => (
          <View key={`${item.label}-${item.value}`} style={styles.evidenceRow}>
            <Text style={styles.evidenceLabel}>{item.label}</Text>
            <Text style={styles.evidenceValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.reasonBlock}>
        <Text style={styles.blockLabel}>Причина</Text>
        <Text style={styles.reasonText}>{insight.reason}</Text>
      </View>

      <View style={styles.actionBlock}>
        <Text style={styles.blockLabel}>Рекомендация</Text>
        <Text style={styles.actionText}>{insight.recommendedAction}</Text>
      </View>

      {insight.cta.label ? (
        <SecondaryButton label={insight.cta.label} onPress={onPressCta} size="sm" />
      ) : null}
    </View>
  );
}

export function SellerRevenueTrendCard({
  points,
}: {
  points: Array<{ date: string; revenue: number; orders: number }>;
}) {
  const maxRevenue = Math.max(...points.map((p) => p.revenue), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Выручка по дням</Text>
      <View style={styles.trendBars}>
        {points.map((point) => {
          const height = Math.max(8, Math.round((point.revenue / maxRevenue) * 72));
          return (
            <View key={point.date} style={styles.trendColumn} accessibilityLabel={`${point.date}: ${point.revenue}`}>
              <View style={[styles.trendBar, { height }]} />
              <Text style={styles.trendValue}>{point.revenue > 0 ? point.revenue : "—"}</Text>
              <Text style={styles.trendDate}>{point.date.slice(5)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: border.default,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    color: text.primary,
    marginBottom: spacing.sm,
  },
  blockLabel: {
    ...typography.caption,
    color: text.muted,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  evidenceBlock: {
    marginBottom: spacing.sm,
  },
  evidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  evidenceLabel: {
    ...typography.bodySmall,
    color: text.secondary,
    flex: 1,
  },
  evidenceValue: {
    ...typography.bodySmall,
    color: text.primary,
    fontWeight: "600",
  },
  reasonBlock: {
    marginBottom: spacing.sm,
  },
  reasonText: {
    ...typography.bodySmall,
    color: text.secondary,
  },
  actionBlock: {
    marginBottom: spacing.sm,
  },
  actionText: {
    ...typography.bodySmall,
    color: brand.primary,
  },
  trendBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.xs,
    minHeight: 96,
  },
  trendColumn: {
    flex: 1,
    alignItems: "center",
  },
  trendBar: {
    width: "100%",
    maxWidth: 28,
    backgroundColor: brand.primary,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  trendValue: {
    ...typography.caption,
    color: text.secondary,
  },
  trendDate: {
    ...typography.caption,
    color: text.muted,
  },
});
