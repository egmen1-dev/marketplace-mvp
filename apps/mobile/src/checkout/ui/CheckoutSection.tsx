import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../theme/tokens";
import { CHECKOUT_BORDER, CHECKOUT_CARD_RADIUS, CHECKOUT_SCREEN_PADDING } from "./constants";

export function CheckoutSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>
        {number}. {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: CHECKOUT_SCREEN_PADDING,
    gap: spacing.md,
  },
  heading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.black,
  },
  card: {
    borderWidth: 1,
    borderColor: CHECKOUT_BORDER,
    borderRadius: CHECKOUT_CARD_RADIUS,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
});
