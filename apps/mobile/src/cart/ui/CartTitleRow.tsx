import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";
import { CART_SCREEN_PADDING } from "./constants";
import { formatCartItemCount } from "./format";

export function CartTitleRow({ itemCount }: { itemCount: number }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Корзина</Text>
      {itemCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{formatCartItemCount(itemCount)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: CART_SCREEN_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: colors.black,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: "#F5F5F5",
  },
  badgeText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#8A8A8A",
  },
});
