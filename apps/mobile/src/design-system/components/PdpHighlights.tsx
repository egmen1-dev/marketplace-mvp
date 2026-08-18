import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CommerceSectionHeader } from "./CommerceSectionHeader";
import { brand, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  items: string[];
};

export const PdpHighlights = memo(function PdpHighlights({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <CommerceSectionHeader title="Почему выбирают этот товар" />
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item} style={styles.row}>
            <MaterialCommunityIcons name="check-decagram-outline" size={18} color={brand.primary} />
            <Text style={styles.label}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  list: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, minHeight: 28 },
  label: { ...typography.body, color: text.secondary, flex: 1 },
});
