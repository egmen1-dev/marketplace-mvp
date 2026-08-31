import { StyleSheet, Text, View } from "react-native";

import { formatPrice } from "../../utils/format";
import { colors, radii, typography } from "../../theme/tokens";
import { formatSavings } from "./utils";

export function ProductPriceCard({
  price,
  compareAt,
}: {
  price: number;
  compareAt?: number | null;
}) {
  const hasDiscount = typeof compareAt === "number" && compareAt > price;
  const savings = hasDiscount ? compareAt - price : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(price)}</Text>
        {hasDiscount ? <Text style={styles.compareAt}>{formatPrice(compareAt)}</Text> : null}
      </View>
      {hasDiscount && savings > 0 ? (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsText}>{formatSavings(savings)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 10,
  },
  price: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: colors.ctaPrimary,
  },
  compareAt: {
    ...typography.body,
    fontSize: 16,
    color: "#8A8A8A",
    textDecorationLine: "line-through",
  },
  savingsBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
    backgroundColor: colors.successSoft,
  },
  savingsText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.success,
  },
});
