import { StyleSheet, Text, View } from "react-native";

import { formatPrice } from "../../utils/format";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { CART_BORDER, CART_CARD_RADIUS, CART_SCREEN_PADDING } from "./constants";

export function CartSummary({
  subtotal,
  totalSaving,
  checkoutCount,
}: {
  subtotal: number;
  totalSaving: number;
  checkoutCount: number;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>Итого</Text>
        <Text style={styles.total}>{formatPrice(subtotal)}</Text>
      </View>
      {totalSaving > 0 ? (
        <View style={styles.row}>
          <Text style={styles.savingLabel}>Вы экономите</Text>
          <Text style={styles.savingValue}>{formatPrice(totalSaving)}</Text>
        </View>
      ) : null}
      {checkoutCount > 0 ? (
        <Text style={styles.hint}>{checkoutCount} {checkoutCount === 1 ? "товар к оформлению" : "товаров к оформлению"}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: CART_SCREEN_PADDING,
    padding: spacing.lg,
    borderRadius: CART_CARD_RADIUS,
    borderWidth: 1,
    borderColor: CART_BORDER,
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
    ...typography.h2,
    fontSize: 18,
    color: colors.black,
  },
  total: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: colors.black,
  },
  savingLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8A8A8A",
  },
  savingValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.success,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#8A8A8A",
  },
});
