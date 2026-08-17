import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { ShimmerBlock } from "../../components/ui/Shimmer";
import { surface } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { spacing } from "../tokens/spacing";

export const FavoritesSkeleton = memo(function FavoritesSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Загрузка избранного">
      <ShimmerBlock height={32} width="50%" />
      <ShimmerBlock height={48} style={styles.search} />
      <ShimmerBlock height={44} width="70%" />
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((key) => (
          <View key={key} style={styles.card}>
            <ShimmerBlock height={168} style={styles.image} />
            <View style={styles.body}>
              <ShimmerBlock height={16} width="90%" />
              <ShimmerBlock height={14} width="55%" />
              <ShimmerBlock height={22} width="40%" />
              <ShimmerBlock height={44} style={styles.cta} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.lg, backgroundColor: surface.background },
  search: { borderRadius: radii.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.md },
  card: { width: "48%", gap: spacing.sm },
  image: { borderRadius: radii.xl },
  body: { gap: spacing.sm },
  cta: { borderRadius: radii.lg },
});
