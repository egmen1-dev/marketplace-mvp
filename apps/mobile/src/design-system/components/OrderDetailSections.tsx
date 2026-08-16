import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { OrderDetailView, OrderItemView } from "../../features/orders/types";
import { formatPrice } from "../../utils/format";
import { border, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  order: OrderDetailView;
};

function ItemRow({ item, currency }: { item: OrderItemView; currency: string }) {
  return (
    <View style={styles.itemRow}>
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
          {item.quantity} × {formatPrice(item.unitPrice, currency)}
        </Text>
      </View>
      <Text style={styles.itemTotal}>{formatPrice(item.totalPrice, currency)}</Text>
    </View>
  );
}

export const OrderDetailSections = memo(function OrderDetailSections({ order }: Props) {
  const currency = order.currency === "RUB" ? "₽" : order.currency;

  return (
    <View style={styles.wrap}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Товары</Text>
        {order.items.map((item) => (
          <ItemRow key={item.id} item={item} currency={currency} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Стоимость</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Товары</Text>
          <Text style={styles.value}>{formatPrice(order.subtotal, currency)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Доставка</Text>
          <Text style={styles.value}>{order.shippingCost > 0 ? formatPrice(order.shippingCost, currency) : "—"}</Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Итого</Text>
          <Text style={styles.totalValue}>{formatPrice(order.total, currency)}</Text>
        </View>
      </View>

      {order.recipientName || order.recipientPhone || order.recipientCity ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Получатель</Text>
          {order.recipientName ? <Text style={styles.body}>{order.recipientName}</Text> : null}
          {order.recipientPhone ? <Text style={styles.muted}>{order.recipientPhone}</Text> : null}
          {order.recipientCity ? <Text style={styles.muted}>{order.recipientCity}</Text> : null}
        </View>
      ) : null}

      {order.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Комментарий</Text>
          <Text style={styles.body}>{order.notes}</Text>
        </View>
      ) : null}

      {order.sellerName ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Продавец</Text>
          <Text style={styles.body}>{order.sellerName}</Text>
        </View>
      ) : null}

      {order.expectedNextAction ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Что дальше</Text>
          <Text style={styles.body}>{order.expectedNextAction}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  section: {
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: border.default,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.subtitle, color: text.primary, fontWeight: "700", marginBottom: spacing.xs },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  thumb: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: surface.backgroundMuted },
  thumbFallback: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: surface.backgroundMuted },
  itemBody: { flex: 1, gap: 2 },
  itemTitle: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  itemMeta: { ...typography.caption, color: text.muted },
  itemTotal: { ...typography.bodySmall, color: text.primary, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { ...typography.bodySmall, color: text.secondary },
  value: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  totalRow: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: border.default },
  totalLabel: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  totalValue: { ...typography.subtitle, color: text.primary, fontWeight: "800" },
  body: { ...typography.body, color: text.primary },
  muted: { ...typography.bodySmall, color: text.muted },
});
