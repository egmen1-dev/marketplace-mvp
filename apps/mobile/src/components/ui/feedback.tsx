import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../../theme/tokens";
import { PrimaryButton, SecondaryButton } from "./buttons";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>📭</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
      {actionLabel && onAction ? <PrimaryButton label={actionLabel} onPress={onAction} style={styles.emptyAction} /> : null}
    </View>
  );
}

export function ErrorState({ title, description, onRetry }: { title: string; description?: string; onRetry?: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>⚠️</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
      {onRetry ? <SecondaryButton label="Повторить" onPress={onRetry} style={styles.emptyAction} /> : null}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.orange} size="large" />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

export function SkeletonBlock({ height = 16, width = "100%" }: { height?: number; width?: number | `${number}%` }) {
  return <View style={[styles.skeleton, { height, width }]} />;
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <SkeletonBlock height={160} />
      <View style={styles.skeletonBody}>
        <SkeletonBlock height={14} width="40%" />
        <SkeletonBlock height={16} />
        <SkeletonBlock height={12} width="70%" />
      </View>
    </View>
  );
}

export function SkeletonGrid() {
  return (
    <View style={styles.skeletonGrid}>
      <ProductCardSkeleton />
      <ProductCardSkeleton />
      <ProductCardSkeleton />
      <ProductCardSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.md },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { ...typography.h2, color: colors.black, textAlign: "center" },
  emptyDescription: { ...typography.body, color: colors.gray500, textAlign: "center" },
  emptyAction: { marginTop: spacing.sm, minWidth: 160 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.md },
  loadingLabel: { ...typography.caption, color: colors.gray500 },
  skeleton: { backgroundColor: colors.gray200, borderRadius: radii.sm },
  skeletonCard: { width: "48%", borderRadius: radii.lg, overflow: "hidden", backgroundColor: colors.white },
  skeletonBody: { padding: spacing.md, gap: spacing.sm },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
});
