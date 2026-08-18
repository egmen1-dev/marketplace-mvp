import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { CartLineView, CheckoutSummary } from "../../features/cart-checkout/types";
import { formatPrice } from "../../utils/format";
import { border, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  items: CartLineView[];
  summary: CheckoutSummary;
};

export const CheckoutOrderSummary = memo(function CheckoutOrderSummary({ items, summary }: Props) {
  const currencyLabel = summary.currency === "RUB" ? "₽" : summary.currency;

  return (
    <View style={styles.section} accessibilityRole="summary">
      <Text style={styles.title}>Итог заказа</Text>
      <View style={styles.items}>
        {items.map((item) => (
          <View key={item.productId} style={styles.itemRow}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={styles.thumbFallback} />
            )}
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.itemMeta}>
                {item.quantity} × {formatPrice(item.price, currencyLabel)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatPrice(item.lineTotal, currencyLabel)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.totals}>
        <View style={styles.row}>
          <Text style={styles.label}>Товары</Text>
          <Text style={styles.value}>{formatPrice(summary.goodsTotal, currencyLabel)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Доставка</Text>
          <Text style={styles.value}>{summary.deliveryCost > 0 ? formatPrice(summary.deliveryCost, currencyLabel) : "Бесплатно"}</Text>
        </View>
        {summary.discountTotal > 0 ? (
          <View style={styles.row}>
            <Text style={styles.label}>Скидка</Text>
            <Text style={styles.discount}>-{formatPrice(summary.discountTotal, currencyLabel)}</Text>
          </View>
        ) : null}
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Итого</Text>
          <Text style={styles.totalValue}>{formatPrice(summary.orderTotal, currencyLabel)}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: border.default,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  items: { gap: spacing.md },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thumb: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: surface.backgroundMuted },
  thumbFallback: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: surface.backgroundMuted },
  itemBody: { flex: 1, gap: 2 },
  itemTitle: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  itemMeta: { ...typography.caption, color: text.muted },
  itemTotal: { ...typography.bodySmall, color: text.primary, fontWeight: "700" },
  totals: { gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: border.default },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { ...typography.bodySmall, color: text.secondary },
  value: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  discount: { ...typography.bodySmall, color: text.primary, fontWeight: "700" },
  totalRow: { marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: border.default },
  totalLabel: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  totalValue: { ...typography.subtitle, color: text.primary, fontWeight: "800" },
});
