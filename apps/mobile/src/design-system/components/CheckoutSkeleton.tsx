import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { ShimmerBlock } from "../primitives/Shimmer";
import { border, surface } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";

export const CheckoutSkeleton = memo(function CheckoutSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Загрузка оформления заказа">
      {[0, 1, 2, 3, 4].map((key) => (
        <View key={key} style={styles.section}>
          <ShimmerBlock height={22} width="40%" />
          <ShimmerBlock height={52} />
          <ShimmerBlock height={52} />
        </View>
      ))}
      <ShimmerBlock height={160} style={styles.summary} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.lg, gap: spacing.lg, backgroundColor: surface.background },
  section: {
    backgroundColor: surface.background,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: border.default,
  },
  summary: { borderRadius: radii.xl },
});
