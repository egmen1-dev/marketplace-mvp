import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { semantic, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  items: string[];
};

export const PdpTrustBlock = memo(function PdpTrustBlock({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel="Блок доверия">
      {items.map((item) => (
        <View key={item} style={styles.row}>
          <MaterialCommunityIcons
            name={item.includes("Проверен") ? "shield-check" : item.includes("наличии") ? "check-circle-outline" : "information-outline"}
            size={16}
            color={item.includes("Нет в наличии") ? semantic.danger : text.secondary}
          />
          <Text style={[styles.label, item.includes("Нет в наличии") ? styles.outOfStock : null]}>{item}</Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: semantic.successSoft,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 24 },
  label: { ...typography.bodySmall, color: text.secondary, flex: 1 },
  outOfStock: { color: semantic.danger },
});
