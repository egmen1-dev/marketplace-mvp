import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { OrderListCardView } from "../../features/orders/types";
import { usePressScale } from "../../hooks/usePressScale";
import { formatPrice } from "../../utils/format";
import { brand, border, semantic, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  order: OrderListCardView;
  onPress: () => void;
};

export const OrderCard = memo(function OrderCard({ order, onPress }: Props) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  const currency = order.currency === "RUB" ? "₽" : order.currency;
  const tone = order.isActive ? brand.primarySoft : surface.backgroundMuted;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.card, { transform: [{ scale }] }]}
      accessibilityRole="button"
      accessibilityLabel={`Заказ ${order.orderNumber}, ${order.statusLabel}, ${formatPrice(order.total, currency)}`}
    >
      <View style={styles.row}>
        <View style={styles.imageWrap}>
          {order.previewImageUrl ? (
            <Image source={{ uri: order.previewImageUrl }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={styles.imageFallback}>
              <MaterialCommunityIcons name="package-variant-closed" size={28} color={brand.primary} />
            </View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.orderNumber}>Заказ {order.orderNumber}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {order.previewTitle ?? `${order.itemCount} ${order.itemCount === 1 ? "товар" : "товара"}`}
          </Text>
          {order.sellerName ? <Text style={styles.seller}>{order.sellerName}</Text> : null}
          <Text style={styles.price}>{formatPrice(order.total, currency)}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <View style={[styles.statusBadge, { backgroundColor: tone }]}>
          <Text style={styles.statusText}>{order.statusLabel}</Text>
        </View>
        <Text style={styles.date}>{order.createdAtLabel}</Text>
        <View style={styles.openRow}>
          <Text style={styles.openText}>Открыть заказ</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={brand.primary} />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: border.default,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  row: { flexDirection: "row", gap: spacing.md },
  imageWrap: { width: 88, height: 88, borderRadius: radii.lg, overflow: "hidden", backgroundColor: surface.backgroundMuted },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: spacing.xs },
  orderNumber: { ...typography.caption, color: text.muted, fontWeight: "600" },
  title: { ...typography.body, color: text.primary, fontWeight: "700" },
  seller: { ...typography.caption, color: text.muted },
  price: { ...typography.subtitle, color: brand.primary, fontWeight: "800" },
  footer: { gap: spacing.sm },
  statusBadge: { alignSelf: "flex-start", borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  statusText: { ...typography.caption, color: text.primary, fontWeight: "700" },
  date: { ...typography.caption, color: text.muted },
  openRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: spacing.xs, minHeight: 44 },
  openText: { ...typography.bodySmall, color: brand.primary, fontWeight: "700" },
});
