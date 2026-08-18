import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatPrice } from "../../utils/format";
import { border, semantic, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  subtotal: number;
  savings: number;
  currency?: string;
};

export const CartPriceSummary = memo(function CartPriceSummary({ subtotal, savings, currency = "₽" }: Props) {
  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.title}>Стоимость заказа</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Товары</Text>
        <Text style={styles.value}>{formatPrice(subtotal, currency)}</Text>
      </View>
      {savings > 0 ? (
        <View style={styles.row}>
          <Text style={styles.label}>Скидка</Text>
          <Text style={styles.discount}>-{formatPrice(savings, currency)}</Text>
        </View>
      ) : null}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>К оплате</Text>
        <Text style={styles.totalValue}>{formatPrice(subtotal, currency)}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: border.default,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.subtitle, color: text.primary, fontWeight: "700", marginBottom: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { ...typography.bodySmall, color: text.secondary },
  value: { ...typography.bodySmall, color: text.primary, fontWeight: "600" },
  discount: { ...typography.bodySmall, color: semantic.success, fontWeight: "700" },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: border.default,
  },
  totalLabel: { ...typography.subtitle, color: text.primary, fontWeight: "700" },
  totalValue: { ...typography.subtitle, color: text.primary, fontWeight: "800" },
});
