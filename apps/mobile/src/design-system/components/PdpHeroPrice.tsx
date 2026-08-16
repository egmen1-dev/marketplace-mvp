import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { discountPercent, formatPrice } from "../../utils/format";
import { brand, semantic, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  price: number;
  compareAt?: number | null;
};

export const PdpHeroPrice = memo(function PdpHeroPrice({ price, compareAt }: Props) {
  const discount = discountPercent(price, compareAt);
  const hasCompare = Boolean(compareAt && compareAt > price);

  return (
    <View style={styles.wrap} accessibilityRole="text" accessibilityLabel={`Цена ${formatPrice(price)}${hasCompare ? `, было ${formatPrice(compareAt)}` : ""}`}>
      <View style={styles.row}>
        <Text style={styles.price}>{formatPrice(price)}</Text>
        {discount ? (
          <View style={styles.discountPill}>
            <Text style={styles.discountLabel}>-{discount}%</Text>
          </View>
        ) : null}
      </View>
      {hasCompare ? <Text style={styles.compareAt}>{formatPrice(compareAt)}</Text> : null}
      {price <= 0 ? <Text style={styles.note}>Цена уточняется у продавца</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  price: { ...typography.display, color: text.primary, fontSize: 32, lineHeight: 38, fontWeight: "800" },
  compareAt: {
    ...typography.body,
    color: text.discount,
    textDecorationLine: "line-through",
  },
  discountPill: {
    backgroundColor: semantic.dangerSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  discountLabel: { ...typography.badge, color: semantic.danger, fontWeight: "700" },
  note: { ...typography.caption, color: text.muted },
});
