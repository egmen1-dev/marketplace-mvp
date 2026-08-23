import { StyleSheet, Text, View } from "react-native";

import { colors, typography } from "../../theme/tokens";

function formatReviewsCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} отзывов`;
  if (mod10 === 1) return `${count} отзыв`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} отзыва`;
  return `${count} отзывов`;
}

export function ProductRatingRow({
  averageRating,
  reviewsCount = 0,
  compact,
}: {
  averageRating?: number | null;
  reviewsCount?: number;
  compact?: boolean;
}) {
  if (compact) {
    if (!averageRating || reviewsCount <= 0) {
      return <View style={styles.compactPlaceholder} />;
    }
  } else if (!averageRating || reviewsCount <= 0) {
    return <Text style={styles.empty}>Отзывов пока нет</Text>;
  }

  return (
    <View style={styles.row}>
      <Text style={[styles.star, compact ? styles.starCompact : null]}>★</Text>
      <Text style={[styles.value, compact ? styles.valueCompact : null]}>{averageRating.toFixed(1)}</Text>
      <Text style={[styles.count, compact ? styles.countCompact : null]}>· {formatReviewsCount(reviewsCount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  star: { color: colors.orange, fontSize: 14, fontWeight: "700" },
  starCompact: { fontSize: 12 },
  value: { ...typography.caption, color: colors.black, fontWeight: "700" },
  valueCompact: { fontSize: 11 },
  count: { ...typography.caption, color: colors.gray500 },
  countCompact: { fontSize: 11 },
  compactPlaceholder: { minHeight: 14 },
  empty: { ...typography.caption, color: colors.gray500, minHeight: 18 },
});
