import { StyleSheet, Text, View } from "react-native";

import { formatPrice } from "../../utils/format";
import { colors, radii, typography } from "../../theme/tokens";

export function CartPriceBlock({
  price,
  compareAt,
  savingTotal,
  muted,
}: {
  price: number;
  compareAt?: number | null;
  savingTotal?: number;
  muted?: boolean;
}) {
  const hasDiscount = typeof compareAt === "number" && compareAt > price;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.price, muted ? styles.muted : null]}>{formatPrice(price)}</Text>
        {hasDiscount ? <Text style={styles.compareAt}>{formatPrice(compareAt)}</Text> : null}
      </View>
      {hasDiscount && savingTotal != null && savingTotal > 0 ? (
        <View style={styles.saving}>
          <Text style={styles.savingText}>Выгода {formatPrice(savingTotal)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 8,
  },
  price: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.ctaPrimary,
  },
  compareAt: {
    ...typography.caption,
    fontSize: 14,
    color: "#8A8A8A",
    textDecorationLine: "line-through",
  },
  saving: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.successSoft,
  },
  savingText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: colors.success,
  },
  muted: {
    color: colors.gray500,
  },
});
