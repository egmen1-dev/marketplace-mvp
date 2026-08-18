import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { ShimmerBlock } from "../primitives/Shimmer";
import { surface } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";

export const CartSkeleton = memo(function CartSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Загрузка корзины">
      <ShimmerBlock height={32} width="45%" style={styles.block} />
      <ShimmerBlock height={88} style={styles.summary} />
      {[0, 1].map((key) => (
        <View key={key} style={styles.card}>
          <ShimmerBlock height={88} width={88} style={styles.thumb} />
          <View style={styles.cardBody}>
            <ShimmerBlock height={18} width="80%" />
            <ShimmerBlock height={14} width="40%" />
            <ShimmerBlock height={20} width="35%" />
          </View>
        </View>
      ))}
      <ShimmerBlock height={120} style={styles.block} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, gap: spacing.lg, backgroundColor: surface.background },
  block: { borderRadius: radii.lg },
  summary: { borderRadius: radii.xl },
  card: { flexDirection: "row", gap: spacing.md },
  thumb: { borderRadius: radii.lg },
  cardBody: { flex: 1, gap: spacing.sm },
});
