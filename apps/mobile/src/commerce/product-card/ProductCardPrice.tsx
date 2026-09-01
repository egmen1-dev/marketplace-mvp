import { StyleSheet, Text, View } from "react-native";

import { formatPrice } from "../../utils/format";
import { colors, typography } from "../../theme/tokens";

export function ProductCardPrice({
  price,
  compareAt,
  compact,
  rowHeight,
}: {
  price: number;
  compareAt?: number | null;
  compact?: boolean;
  rowHeight: number;
}) {
  const showCompareAt = typeof compareAt === "number" && compareAt > price;

  return (
    <View style={[styles.row, { minHeight: rowHeight }]}>
      <Text style={[styles.price, compact ? styles.priceCompact : null]} numberOfLines={1}>
        {formatPrice(price)}
      </Text>
      {showCompareAt ? (
        <Text style={[styles.compareAt, compact ? styles.compareAtCompact : null]} numberOfLines={1}>
          {formatPrice(compareAt)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  price: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.ctaPrimary,
    flexShrink: 0,
  },
  priceCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
  compareAt: {
    ...typography.caption,
    fontSize: 13,
    color: "#8A8A8A",
    textDecorationLine: "line-through",
    flexShrink: 1,
  },
  compareAtCompact: {
    fontSize: 12,
  },
});
