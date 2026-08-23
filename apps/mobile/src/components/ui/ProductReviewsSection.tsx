import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { fetchProductReviews, type ProductReviewDto, type ProductRatingSnapshot } from "../../api/endpoints";
import { loadAppConfig } from "../../config/env";
import { resolveImageUrl } from "../../utils/format";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { ProductRatingRow } from "./ProductRatingRow";
import { SecondaryButton } from "./buttons";

function StarBar({ stars, percent }: { stars: number; percent: number }) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{stars}★</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.barPercent}>{percent}%</Text>
    </View>
  );
}

function ReviewItem({ review }: { review: ProductReviewDto }) {
  const config = loadAppConfig();
  const date = new Date(review.createdAt).toLocaleDateString("ru-RU");

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewStars}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</Text>
        <Text style={styles.reviewAuthor}>{review.buyerName ?? "Покупатель"}</Text>
        <Text style={styles.reviewDate}>{date}</Text>
      </View>
      {review.text ? <Text style={styles.reviewText}>{review.text}</Text> : null}
      {review.pros ? <Text style={styles.reviewMeta}>Плюсы: {review.pros}</Text> : null}
      {review.cons ? <Text style={styles.reviewMeta}>Минусы: {review.cons}</Text> : null}
      {review.photos.length > 0 ? (
        <View style={styles.photoRow}>
          {review.photos.map((photo) => (
            <Image
              key={photo.id}
              source={{ uri: resolveImageUrl(photo.url, config.apiBaseUrl) ?? undefined }}
              style={styles.photo}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function ProductReviewsSection({ productId }: { productId: string }) {
  const [rating, setRating] = useState<ProductRatingSnapshot | null>(null);
  const [reviews, setReviews] = useState<ProductReviewDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextCursor?: string | null, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const page = await fetchProductReviews(productId, nextCursor);
        setRating(page.rating);
        setReviews((prev) => {
          const merged = append ? [...prev, ...page.items] : page.items;
          const seen = new Set<string>();
          return merged.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        });
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить отзывы");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [productId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>Отзывы покупателей</Text>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  if (!rating && reviews.length === 0 && !error) {
    return (
      <View style={styles.section}>
        <Text style={styles.title}>Отзывы покупателей</Text>
        <Text style={styles.empty}>Отзывов пока нет</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Отзывы покупателей</Text>
      {rating ? (
        <View style={styles.summary}>
          <Text style={styles.avg}>{rating.averageRating.toFixed(1)} ★</Text>
          <ProductRatingRow averageRating={rating.averageRating} reviewsCount={rating.reviewsCount} />
          {rating.distribution.map((row) => (
            <StarBar key={row.stars} stars={row.stars} percent={row.percent} />
          ))}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {reviews.map((review) => (
        <ReviewItem key={review.id} review={review} />
      ))}

      {hasMore ? (
        <SecondaryButton
          label={loadingMore ? "Загрузка…" : "Показать ещё"}
          onPress={() => load(cursor, true)}
          fullWidth
          disabled={loadingMore}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  title: { ...typography.h2, color: colors.black },
  summary: { gap: spacing.sm, backgroundColor: colors.gray100, borderRadius: radii.lg, padding: spacing.lg },
  avg: { ...typography.display, color: colors.black, fontSize: 28 },
  barRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  barLabel: { width: 28, ...typography.caption, color: colors.gray700 },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.gray200, borderRadius: radii.pill, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.orange },
  barPercent: { width: 36, ...typography.caption, color: colors.gray500, textAlign: "right" },
  reviewCard: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  reviewStars: { color: colors.orange, fontWeight: "700" },
  reviewAuthor: { ...typography.caption, color: colors.gray900, fontWeight: "600" },
  reviewDate: { ...typography.caption, color: colors.gray500 },
  reviewText: { ...typography.body, color: colors.gray900 },
  reviewMeta: { ...typography.caption, color: colors.gray700 },
  photoRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  photo: { width: 64, height: 64, borderRadius: radii.md, backgroundColor: colors.gray100 },
  empty: { ...typography.body, color: colors.gray500 },
  error: { ...typography.caption, color: colors.danger },
});
