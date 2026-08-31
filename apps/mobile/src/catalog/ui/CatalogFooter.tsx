import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "../../theme/tokens";
import { ShimmerBlock } from "../../components/ui/Shimmer";
import { CATALOG_CARD_WIDTH } from "./constants";

export function CatalogLoadMore({ loading, onPress }: { loading?: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.wrap} onPress={onPress} disabled={loading} accessibilityRole="button">
      {loading ? (
        <ActivityIndicator color={colors.ctaPrimary} />
      ) : (
        <>
          <Text style={styles.text}>Показать ещё</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.black} />
        </>
      )}
    </Pressable>
  );
}

export function CatalogSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <ShimmerBlock style={styles.skeletonImage} />
          <ShimmerBlock style={styles.skeletonLineLg} />
          <ShimmerBlock style={styles.skeletonLineMd} />
          <ShimmerBlock style={styles.skeletonLineSm} />
          <ShimmerBlock style={styles.skeletonBtn} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 48,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.black,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: spacing.lg,
  },
  skeletonCard: {
    width: CATALOG_CARD_WIDTH,
    gap: 8,
    marginBottom: 12,
  },
  skeletonImage: {
    width: "100%",
    height: 148,
    borderRadius: radii.md,
  },
  skeletonLineLg: { width: "70%", height: 18, borderRadius: 6 },
  skeletonLineMd: { width: "100%", height: 14, borderRadius: 6 },
  skeletonLineSm: { width: "55%", height: 12, borderRadius: 6 },
  skeletonBtn: { width: "100%", height: 36, borderRadius: radii.md, marginTop: 4 },
});
