import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../../theme/tokens";
import { ShimmerBlock } from "./Shimmer";
import { PrimaryButton, SecondaryButton } from "./buttons";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const EMPTY_PRESETS = {
  favorites: { icon: "heart-outline" as IconName, title: "Избранное пусто", description: "Сохраняйте товары сердечком — они появятся здесь." },
  cart: { icon: "cart-outline" as IconName, title: "Корзина пуста", description: "Добавьте товары из каталога или главной." },
  orders: { icon: "package-variant-closed" as IconName, title: "Заказов пока нет", description: "Оформите первую покупку — статус появится здесь." },
  sales: { icon: "chart-line" as IconName, title: "Продаж пока нет", description: "Когда покупатели оформят заказы, они отобразятся в этом разделе." },
  products: { icon: "tag-outline" as IconName, title: "Нет товаров", description: "Создайте первый товар в веб-кабинете продавца." },
  wallet: { icon: "wallet-outline" as IconName, title: "Операций пока нет", description: "История пополнений и выплат появится после первых транзакций." },
  history: { icon: "history" as IconName, title: "История пуста", description: "Здесь будут последние действия и переводы." },
  catalog: { icon: "magnify" as IconName, title: "Ничего не найдено", description: "Измените запрос или сбросьте фильтры." },
} as const;

export type EmptyPreset = keyof typeof EMPTY_PRESETS;

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  preset,
  icon,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  preset?: EmptyPreset;
  icon?: IconName;
}) {
  const presetData = preset ? EMPTY_PRESETS[preset] : null;
  const resolvedTitle = title ?? presetData?.title ?? "Пусто";
  const resolvedDescription = description ?? presetData?.description;
  const resolvedIcon = icon ?? presetData?.icon ?? "inbox-outline";

  return (
    <View style={styles.empty}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={resolvedIcon} size={32} color={colors.orange} />
      </View>
      <Text style={styles.emptyTitle}>{resolvedTitle}</Text>
      {resolvedDescription ? <Text style={styles.emptyDescription}>{resolvedDescription}</Text> : null}
      {actionLabel && onAction ? <PrimaryButton label={actionLabel} onPress={onAction} style={styles.emptyAction} /> : null}
    </View>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  variant = "network",
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  variant?: "network" | "offline" | "server" | "auth";
}) {
  const icon: IconName =
    variant === "offline" ? "wifi-off" : variant === "server" ? "server-off" : variant === "auth" ? "account-alert-outline" : "cloud-alert-outline";

  return (
    <View style={styles.empty}>
      <View style={[styles.iconWrap, styles.errorIconWrap]}>
        <MaterialCommunityIcons name={icon} size={32} color={colors.warning} />
      </View>
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
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  errorIconWrap: { backgroundColor: "#FFF7ED" },
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
