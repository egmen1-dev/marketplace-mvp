import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";
import { CHECKOUT_BORDER } from "./constants";

export function CheckoutNextStepInfo() {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={20} color={colors.ctaPrimary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Доставка и получение</Text>
          <Text style={styles.subtitle}>Выберите на странице оформления заказа</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="credit-card-outline" size={20} color={colors.ctaPrimary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Оплата</Text>
          <Text style={styles.subtitle}>Способ оплаты выбирается на следующем шаге</Text>
        </View>
      </View>
      <View style={styles.note}>
        <MaterialCommunityIcons name="lock-outline" size={16} color={colors.gray500} />
        <Text style={styles.noteText}>
          Оплата проходит на защищённой странице — ЛОТ не хранит данные карты.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  divider: {
    height: 1,
    backgroundColor: CHECKOUT_BORDER,
    marginHorizontal: spacing.lg,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: CHECKOUT_BORDER,
    backgroundColor: "#FAFAFA",
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: "#8A8A8A",
  },
});
