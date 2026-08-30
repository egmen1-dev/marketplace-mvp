import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";
import { CHECKOUT_BORDER } from "./constants";
import { CheckoutRadio } from "./CheckoutRadio";

export function CheckoutPaymentInfo() {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <CheckoutRadio selected />
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="credit-card-outline" size={20} color={colors.ctaPrimary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Онлайн-оплата</Text>
          <Text style={styles.subtitle}>Банковская карта на защищённой странице</Text>
          <Text style={styles.fee}>Без комиссии</Text>
        </View>
      </View>
      <CheckoutSecurityRow />
    </View>
  );
}

export function CheckoutSecurityRow() {
  return (
    <View style={styles.security}>
      <MaterialCommunityIcons name="lock-outline" size={16} color={colors.gray500} />
      <Text style={styles.securityText}>
        Безопасная оплата. Оплата проходит на защищённой странице платёжного сервиса — ЛОТ не хранит данные карты.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: 12,
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
  fee: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.success,
    marginTop: 2,
  },
  security: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: CHECKOUT_BORDER,
    backgroundColor: "#FAFAFA",
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: "#8A8A8A",
  },
});
