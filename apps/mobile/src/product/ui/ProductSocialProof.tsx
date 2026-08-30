import { StyleSheet, Text, View } from "react-native";

import { formatReviewsCount } from "../../catalog/ui/format";
import { colors } from "../../theme/tokens";

export function ProductSocialProof({
  averageRating,
  reviewsCount,
}: {
  averageRating?: number | null;
  reviewsCount?: number;
}) {
  const count = reviewsCount ?? 0;
  const rating = averageRating ?? null;

  if (!rating || count <= 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.empty}>Отзывов пока нет</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.rating}>{rating.toFixed(1)}</Text>
      <Text style={styles.sep}>|</Text>
      <Text style={styles.reviews}>{formatReviewsCount(count)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 20,
    paddingHorizontal: 16,
    marginTop: -4,
  },
  star: {
    color: colors.ctaPrimary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  rating: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    color: colors.black,
  },
  sep: {
    fontSize: 14,
    lineHeight: 18,
    color: "#D0D0D0",
  },
  reviews: {
    fontSize: 14,
    lineHeight: 18,
    color: "#8A8A8A",
  },
  empty: {
    fontSize: 14,
    lineHeight: 18,
    color: "#8A8A8A",
    paddingHorizontal: 16,
    marginTop: -4,
  },
});
