import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";
import { CHECKOUT_SCREEN_PADDING } from "./constants";
import { formatCheckoutSubtitle } from "./format";

export function CheckoutTitleRow({ itemCount, totalLabel }: { itemCount: number; totalLabel: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Оформление заказа</Text>
      {itemCount > 0 ? <Text style={styles.subtitle}>{formatCheckoutSubtitle(itemCount, totalLabel)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: CHECKOUT_SCREEN_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.black,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    color: "#8A8A8A",
  },
});
