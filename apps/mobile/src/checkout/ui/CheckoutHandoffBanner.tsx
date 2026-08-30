import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";

export function CheckoutHandoffBanner() {
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name="open-in-new" size={20} color={colors.ctaPrimary} />
      <Text style={styles.text}>
        Доставка и оплата выбираются на следующем шаге — откроется страница оформления заказа.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.orangeSoft,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray900,
  },
});
