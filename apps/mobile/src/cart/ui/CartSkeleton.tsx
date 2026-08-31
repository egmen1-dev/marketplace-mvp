import { StyleSheet, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";
import { CART_ITEM_IMAGE, CART_SCREEN_PADDING } from "./constants";

function Block({ height, style }: { height: number; style?: object }) {
  return <View style={[styles.block, { height }, style]} />;
}

export function CartSkeleton() {
  return (
    <View style={styles.screen}>
      <Block height={52} style={styles.header} />
      <Block height={34} style={styles.title} />
      {[0, 1].map((i) => (
        <View key={i} style={[styles.card, i === 0 ? styles.cardFirst : null]}>
          <Block height={CART_ITEM_IMAGE} style={styles.image} />
          <View style={styles.lines}>
            <Block height={16} style={{ width: "88%" }} />
            <Block height={14} style={{ width: "42%" }} />
            <Block height={18} style={{ width: "56%" }} />
          </View>
        </View>
      ))}
      <Block height={96} style={styles.summary} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  header: {
    marginHorizontal: CART_SCREEN_PADDING,
    borderRadius: radii.sm,
  },
  title: {
    marginHorizontal: CART_SCREEN_PADDING,
    width: 180,
    borderRadius: radii.sm,
  },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: CART_SCREEN_PADDING,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  cardFirst: {
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  image: {
    width: CART_ITEM_IMAGE,
    borderRadius: radii.md,
  },
  lines: {
    flex: 1,
    gap: 8,
    paddingTop: 4,
  },
  summary: {
    marginHorizontal: CART_SCREEN_PADDING,
    borderRadius: radii.lg,
  },
  block: {
    backgroundColor: "#F0F0F0",
    borderRadius: radii.sm,
  },
});
