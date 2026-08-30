import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/tokens";

export function HomeProductRating({
  averageRating,
  reviewsCount = 0,
}: {
  averageRating?: number | null;
  reviewsCount?: number;
}) {
  if (!averageRating || reviewsCount <= 0) {
    return <View style={styles.placeholder} />;
  }

  return (
    <View style={styles.row}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.rating}>{averageRating.toFixed(1)}</Text>
      <Text style={styles.reviews}>{reviewsCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 16,
  },
  star: {
    color: colors.ctaPrimary,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },
  rating: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
    color: colors.black,
  },
  reviews: {
    fontSize: 12,
    lineHeight: 14,
    color: "#8A8A8A",
  },
  placeholder: {
    minHeight: 16,
  },
});
