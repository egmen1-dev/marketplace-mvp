import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatPrice } from "../../utils/format";
import { colors, radii, shadows, spacing, typography } from "../../theme/tokens";
import { productStatusLabel, productStatusTone } from "../../theme/status-labels";
import { Badge } from "./primitives";

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneColors = {
    neutral: colors.gray100,
    success: colors.successSoft,
    warning: colors.orangeSoft,
    danger: colors.dangerSoft,
  };
  return (
    <View style={[styles.metricCard, { backgroundColor: toneColors[tone] }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </View>
  );
}

export function WalletCard({
  balance,
  withdrawable,
  pending,
}: {
  balance: number;
  withdrawable: number;
  pending: number;
}) {
  return (
    <View style={styles.walletCard}>
      <Text style={styles.walletLabel}>Баланс</Text>
      <Text style={styles.walletBalance}>{formatPrice(balance)}</Text>
      <View style={styles.walletRow}>
        <View style={styles.walletStat}>
          <Text style={styles.walletStatLabel}>К выводу</Text>
          <Text style={styles.walletStatValue}>{formatPrice(withdrawable)}</Text>
        </View>
        <View style={styles.walletStat}>
          <Text style={styles.walletStatLabel}>Ожидание</Text>
          <Text style={styles.walletStatValue}>{formatPrice(pending)}</Text>
        </View>
      </View>
    </View>
  );
}

export function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoBody}>{body}</Text>
    </View>
  );
}

export function SellerCard({
  storeName,
  subtitle,
  onPress,
}: {
  storeName: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.sellerAvatar}>
        <Text style={styles.sellerAvatarText}>{storeName.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.sellerBody}>
        <Text style={styles.sellerName}>{storeName}</Text>
        {subtitle ? <Text style={styles.sellerSubtitle}>{subtitle}</Text> : null}
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.sellerCard}>{content}</View>;
  }

  return (
    <Pressable
      style={styles.sellerCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Перейти к продавцу ${storeName}`}
    >
      {content}
    </Pressable>
  );
}

export function SellerProductRow({
  title,
  price,
  stock,
  status,
  imageUrl,
}: {
  title: string;
  price: number;
  stock: number;
  status: string;
  imageUrl?: string | null;
}) {
  const tone = productStatusTone(status);
  return (
    <View style={styles.productRow}>
      <View style={styles.thumb}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.thumbImage} contentFit="cover" /> : <Text style={styles.thumbPlaceholder}>📦</Text>}
      </View>
      <View style={styles.productRowBody}>
        <Text style={styles.productRowTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.productRowPrice}>{formatPrice(price)}</Text>
        <View style={styles.productRowMeta}>
          <Badge label={productStatusLabel(status)} tone={tone} />
          <Text style={styles.stockText}>Остаток: {stock}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metricCard: { flex: 1, minWidth: "45%", borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs, ...shadows.card },
  metricLabel: { ...typography.caption, color: colors.gray500 },
  metricValue: { ...typography.h2, color: colors.black },
  metricHint: { ...typography.caption, color: colors.gray700 },
  walletCard: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    backgroundColor: colors.black,
    gap: spacing.sm,
    ...shadows.card,
  },
  walletLabel: { ...typography.caption, color: colors.gray300 },
  walletBalance: { ...typography.display, color: colors.white },
  walletRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm },
  walletStat: { flex: 1, gap: spacing.xs },
  walletStatLabel: { ...typography.caption, color: colors.gray500 },
  walletStatValue: { ...typography.body, color: colors.white, fontWeight: "600" },
  infoCard: { backgroundColor: colors.orangeSoft, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  infoTitle: { ...typography.h2, color: colors.black },
  infoBody: { ...typography.body, color: colors.gray700 },
  sellerCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.gray100, borderRadius: radii.lg },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center" },
  sellerAvatarText: { ...typography.h2, color: colors.white },
  sellerBody: { flex: 1, gap: spacing.xs },
  sellerName: { ...typography.h2, color: colors.black },
  sellerSubtitle: { ...typography.caption, color: colors.gray500 },
  productRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  thumb: { width: 72, height: 72, borderRadius: radii.md, backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: { fontSize: 24 },
  productRowBody: { flex: 1, gap: spacing.xs },
  productRowTitle: { ...typography.body, fontWeight: "600", color: colors.black },
  productRowPrice: { ...typography.body, color: colors.orange, fontWeight: "700" },
  productRowMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  stockText: { ...typography.caption, color: colors.gray500 },
});
