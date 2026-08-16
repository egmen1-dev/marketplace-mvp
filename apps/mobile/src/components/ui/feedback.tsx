import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../../theme/tokens";
import { ShimmerBlock } from "./Shimmer";
import { PrimaryButton, SecondaryButton } from "./buttons";

const EMPTY_PRESETS = {
  favorites: { emoji: "♡", title: "Избранное пусто", description: "Сохраняйте товары сердечком — они появятся здесь." },
  cart: { emoji: "🛒", title: "Корзина пуста", description: "Добавьте товары из каталога или главной." },
  orders: { emoji: "📦", title: "Заказов пока нет", description: "Оформите первую покупку — статус появится здесь." },
  sales: { emoji: "📈", title: "Продаж пока нет", description: "Когда покупатели оформят заказы, они отобразятся в этом разделе." },
  products: { emoji: "🏷️", title: "Нет товаров", description: "Создайте первый товар в веб-кабинете продавца." },
  wallet: { emoji: "💳", title: "Операций пока нет", description: "История пополнений и выплат появится после первых транзакций." },
  history: { emoji: "🕘", title: "История пуста", description: "Здесь будут последние действия и переводы." },
  catalog: { emoji: "🔍", title: "Ничего не найдено", description: "Измените запрос или сбросьте фильтры." },
} as const;

export type EmptyPreset = keyof typeof EMPTY_PRESETS;

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  preset,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  preset?: EmptyPreset;
}) {
  const presetData = preset ? EMPTY_PRESETS[preset] : null;
  const resolvedTitle = title ?? presetData?.title ?? "Пусто";
  const resolvedDescription = description ?? presetData?.description;

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{presetData?.emoji ?? "📭"}</Text>
      <Text style={styles.emptyTitle}>{resolvedTitle}</Text>
      {resolvedDescription ? <Text style={styles.emptyDescription}>{resolvedDescription}</Text> : null}
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
  return <ShimmerBlock height={height} width={width} />;
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <ShimmerBlock height={160} />
      <View style={styles.skeletonBody}>
        <ShimmerBlock height={14} width="40%" />
        <ShimmerBlock height={16} />
        <ShimmerBlock height={12} width="70%" />
        <ShimmerBlock height={32} />
      </View>
    </View>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: count }).map((_, idx) => (
        <ProductCardSkeleton key={idx} />
      ))}
    </View>
  );
}

export function HomeSectionSkeleton() {
  return (
    <View style={styles.sectionSkeleton}>
      <ShimmerBlock height={18} width="40%" />
      <SkeletonGrid count={2} />
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
  skeletonCard: { width: "48%", borderRadius: radii.lg, overflow: "hidden", backgroundColor: colors.white },
  skeletonBody: { padding: spacing.md, gap: spacing.sm },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
  sectionSkeleton: { gap: spacing.md },
});
