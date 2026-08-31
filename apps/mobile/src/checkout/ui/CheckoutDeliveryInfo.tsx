import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";
import { CheckoutRadio } from "./CheckoutRadio";

export function CheckoutDeliveryInfo() {
  return (
    <View style={styles.row}>
      <CheckoutRadio selected />
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="truck-delivery-outline" size={20} color={colors.ctaPrimary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Способ получения</Text>
        <Text style={styles.subtitle}>Выберите на странице оформления заказа</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray500} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.black,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#8A8A8A",
  },
});
