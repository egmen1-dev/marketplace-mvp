import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { PRODUCT_SCREEN_PADDING } from "./constants";

export const PRODUCT_DIVIDER_COLOR = "#E8E8E8";

export function ProductSectionDivider() {
  return <View style={styles.divider} />;
}

export function ProductSection({
  children,
  style,
  topDivider = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  topDivider?: boolean;
}) {
  return (
    <View style={[styles.section, topDivider ? styles.topDivider : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: PRODUCT_DIVIDER_COLOR,
    marginHorizontal: PRODUCT_SCREEN_PADDING,
  },
  section: {
    paddingHorizontal: PRODUCT_SCREEN_PADDING,
    paddingVertical: 16,
    gap: 12,
  },
  topDivider: {
    borderTopWidth: 1,
    borderTopColor: PRODUCT_DIVIDER_COLOR,
  },
});
