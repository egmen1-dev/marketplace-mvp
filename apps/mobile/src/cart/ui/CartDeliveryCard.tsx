import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";
import { CART_BORDER, CART_SCREEN_PADDING } from "./constants";

export function CartDeliveryCard() {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={20} color={colors.black} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Доставка и получение</Text>
          <Text style={styles.subtitle}>Способ получения выберете при оформлении</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gray500} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.lg,
    paddingHorizontal: CART_SCREEN_PADDING,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: CART_BORDER,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
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
