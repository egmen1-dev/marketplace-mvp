import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { ShimmerBlock } from "../primitives/Shimmer";
import { surface } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";

export const OrdersSkeleton = memo(function OrdersSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Загрузка заказов">
      <ShimmerBlock height={32} width="55%" />
      <ShimmerBlock height={64} style={styles.summary} />
      {[0, 1].map((key) => (
        <View key={key} style={styles.card}>
          <ShimmerBlock height={88} width={88} style={styles.thumb} />
          <View style={styles.body}>
            <ShimmerBlock height={16} width="50%" />
            <ShimmerBlock height={20} width="85%" />
            <ShimmerBlock height={14} width="40%" />
            <ShimmerBlock height={22} width="35%" />
          </View>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.lg, backgroundColor: surface.background },
  summary: { borderRadius: radii.xl },
  card: { flexDirection: "row", gap: spacing.md },
  thumb: { borderRadius: radii.lg },
  body: { flex: 1, gap: spacing.sm },
});
