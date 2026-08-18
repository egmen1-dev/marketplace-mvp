import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { usePressScale } from "../../hooks/usePressScale";
import { formatPrice } from "../../utils/format";
import { Badge } from "../primitives/Badge";
import { brand, border, semantic, surface, text } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import type { SellerOperationalOrderView } from "../../features/seller/orders/seller-orders-view";

type Props = {
  order: SellerOperationalOrderView;
  onPress?: () => void;
  onMenuPress?: () => void;
};

export const SellerOperationalOrderCard = memo(function SellerOperationalOrderCard({
  order,
  onPress,
  onMenuPress,
}: Props) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);

  const accessibilityLabel = [
    `Заказ ${order.orderNumber}`,
    order.statusLabel,
    order.buyerName,
    formatPrice(order.sellerSubtotal, order.currency),
    `${order.itemCount} позиций`,
  ].join(". ");

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[styles.card, order.isOverdue ? styles.cardOverdue : null]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderNumber}>№ {order.orderNumber}</Text>
            <Text style={styles.date}>{order.createdAtLabel}</Text>
          </View>
          {onMenuPress ? (
            <Pressable
              style={styles.menuBtn}
              onPress={onMenuPress}
              accessibilityRole="button"
              accessibilityLabel={`Действия с заказом ${order.orderNumber}`}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="dots-vertical" size={20} color={text.secondary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <Badge label={order.statusLabel} tone={order.statusTone} />
          <Badge label={order.fulfillmentLabel} tone="neutral" />
        </View>

        <Text style={styles.buyer}>{order.buyerName}</Text>
        {order.previewTitle ? (
          <Text style={styles.preview} numberOfLines={1}>
            {order.previewTitle}
            {order.itemCount > 1 ? ` и ещё ${order.itemCount - 1}` : ""}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.amount}>{formatPrice(order.sellerSubtotal, order.currency)}</Text>
          <Text style={styles.itemCount}>{order.itemCount} шт.</Text>
        </View>

        {order.isOverdue ? <Text style={styles.overdue}>Требует срочного действия</Text> : null}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: border.default,
    ...shadows.card,
    minHeight: layout.buttonHeight * 2,
  },
  cardOverdue: {
    borderColor: semantic.danger,
    backgroundColor: semantic.dangerSoft,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  headerLeft: { flex: 1, gap: spacing.xs },
  orderNumber: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  date: { ...typography.caption, color: text.muted },
  menuBtn: {
    minWidth: layout.buttonHeight,
    minHeight: layout.buttonHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  buyer: { ...typography.body, color: text.primary },
  preview: { ...typography.caption, color: text.muted },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amount: { ...typography.price, color: brand.primary, fontWeight: "700" },
  itemCount: { ...typography.caption, color: text.muted },
  overdue: { ...typography.caption, color: semantic.danger, fontWeight: "700" },
});
