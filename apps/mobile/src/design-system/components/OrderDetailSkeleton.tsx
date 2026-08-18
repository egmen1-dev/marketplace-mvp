import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { ShimmerBlock } from "../primitives/Shimmer";
import { surface } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";

export const OrderDetailSkeleton = memo(function OrderDetailSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Загрузка заказа">
      <ShimmerBlock height={28} width="60%" />
      <ShimmerBlock height={20} width="40%" />
      <ShimmerBlock height={160} style={styles.block} />
      <ShimmerBlock height={220} style={styles.block} />
      <ShimmerBlock height={180} style={styles.block} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.lg, backgroundColor: surface.background },
  block: { borderRadius: radii.xl },
});
