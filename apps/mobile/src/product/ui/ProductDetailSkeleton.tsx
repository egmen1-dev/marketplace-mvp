import { StyleSheet, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";
import { PRODUCT_CARD_RADIUS, PRODUCT_GALLERY_HEIGHT, PRODUCT_GALLERY_RADIUS, PRODUCT_GALLERY_WIDTH, PRODUCT_SCREEN_PADDING } from "./constants";

function Block({ height, style }: { height: number; style?: object }) {
  return <View style={[styles.block, { height }, style]} />;
}

export function ProductDetailSkeleton() {
  return (
    <View style={styles.screen}>
      <Block height={52} style={styles.header} />
      <View style={styles.gallery}>
        <Block height={PRODUCT_GALLERY_HEIGHT} style={styles.galleryBlock} />
      </View>
      <View style={styles.content}>
        <Block height={28} style={{ width: "92%" }} />
        <Block height={18} style={{ width: "48%" }} />
        <Block height={110} style={styles.card} />
        <Block height={140} style={styles.card} />
        <Block height={96} style={styles.card} />
        <Block height={180} style={styles.card} />
        <Block height={120} style={styles.card} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    marginHorizontal: PRODUCT_SCREEN_PADDING,
    marginTop: spacing.sm,
    borderRadius: radii.sm,
  },
  gallery: {
    paddingHorizontal: PRODUCT_SCREEN_PADDING,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  galleryBlock: {
    width: PRODUCT_GALLERY_WIDTH,
    borderRadius: PRODUCT_GALLERY_RADIUS,
  },
  content: {
    paddingHorizontal: PRODUCT_SCREEN_PADDING,
    gap: spacing.lg,
  },
  card: {
    borderRadius: PRODUCT_CARD_RADIUS,
  },
  block: {
    backgroundColor: "#F0F0F0",
    borderRadius: radii.sm,
  },
});
