import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";
import { formatPrice } from "../../utils/format";
import { CHECKOUT_BORDER, CHECKOUT_CARD_RADIUS, CHECKOUT_SCREEN_PADDING } from "./constants";
import { formatCartItemCount } from "./format";

export function CheckoutSummary({
  itemCount,
  subtotal,
  totalSaving,
}: {
  itemCount: number;
  subtotal: number;
  totalSaving: number;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>Товары ({itemCount})</Text>
        <Text style={styles.value}>{formatPrice(subtotal)}</Text>
      </View>
      {totalSaving > 0 ? (
        <View style={styles.row}>
          <Text style={styles.label}>Скидка</Text>
          <Text style={styles.discount}>− {formatPrice(totalSaving)}</Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <Text style={styles.label}>Доставка</Text>
        <Text style={styles.pending}>Рассчитается при оформлении</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.totalLabel}>Итого</Text>
        <Text style={styles.totalValue}>{formatPrice(subtotal)}</Text>
      </View>
      {totalSaving > 0 ? (
        <Text style={styles.savingHint}>Вы экономите {formatPrice(totalSaving)}</Text>
      ) : null}
      {itemCount > 0 ? <Text style={styles.hint}>{formatCartItemCount(itemCount)} к оформлению</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: CHECKOUT_SCREEN_PADDING,
    padding: spacing.lg,
    borderRadius: CHECKOUT_CARD_RADIUS,
    borderWidth: 1,
    borderColor: CHECKOUT_BORDER,
    backgroundColor: "#FAFAFA",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8A8A8A",
  },
  value: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.black,
  },
  discount: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.success,
  },
  pending: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: "#8A8A8A",
    textAlign: "right",
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: CHECKOUT_BORDER,
    marginVertical: 2,
  },
  totalLabel: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: colors.black,
  },
  totalValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: colors.black,
  },
  savingHint: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.success,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#8A8A8A",
  },
});
