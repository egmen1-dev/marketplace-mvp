import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryCTA } from "./PrimaryCTA";
import { brand, surface, text } from "../tokens/colors";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  onBrowseCatalog: () => void;
};

export const OrdersEmptyState = memo(function OrdersEmptyState({ onBrowseCatalog }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.illustration}>
        <MaterialCommunityIcons name="clipboard-text-clock-outline" size={72} color={brand.primaryMuted} />
      </View>
      <Text style={styles.title}>Заказов пока нет</Text>
      <Text style={styles.body}>Когда вы оформите покупку, здесь появится статус и история — вы всегда будете понимать, что происходит с заказом.</Text>
      <PrimaryCTA label="Перейти в каталог" fullWidth onPress={onBrowseCatalog} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing["3xl"],
    gap: spacing.lg,
  },
  illustration: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.h1, color: text.primary, textAlign: "center" },
  body: { ...typography.body, color: text.secondary, textAlign: "center", lineHeight: 22 },
});
