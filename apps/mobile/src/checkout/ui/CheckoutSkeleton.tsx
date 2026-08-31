import { StyleSheet, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";
import { CHECKOUT_SCREEN_PADDING } from "./constants";

function Block({ height, style }: { height: number; style?: object }) {
  return <View style={[styles.block, { height }, style]} />;
}

export function CheckoutSkeleton() {
  return (
    <View style={styles.screen}>
      <Block height={34} style={styles.title} />
      <Block height={18} style={styles.subtitle} />
      <Block height={120} style={styles.card} />
      <Block height={160} style={styles.card} />
      <Block height={140} style={styles.card} />
      <Block height={120} style={styles.summary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  title: {
    marginHorizontal: CHECKOUT_SCREEN_PADDING,
    width: 220,
    borderRadius: radii.sm,
  },
  subtitle: {
    marginHorizontal: CHECKOUT_SCREEN_PADDING,
    width: 180,
    borderRadius: radii.sm,
  },
  card: {
    marginHorizontal: CHECKOUT_SCREEN_PADDING,
    borderRadius: radii.lg,
  },
  summary: {
    marginHorizontal: CHECKOUT_SCREEN_PADDING,
    borderRadius: radii.lg,
  },
  block: {
    backgroundColor: "#F0F0F0",
    borderRadius: radii.sm,
  },
});
