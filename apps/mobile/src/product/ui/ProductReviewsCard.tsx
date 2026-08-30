import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { fetchProductReviews, type ProductRatingSnapshot, type ProductReviewDto } from "../../api/endpoints";
import { loadAppConfig } from "../../config/env";
import { resolveImageUrl } from "../../utils/format";
import { colors, radii, spacing } from "../../theme/tokens";
import { ratingQualityLabel } from "./utils";

function StarBar({ stars, percent }: { stars: number; percent: number }) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{stars}★</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

function ReviewPreview({ review }: { review: ProductReviewDto }) {
  const config = loadAppConfig();
  return (
    <View style={styles.reviewItem}>
      <Text style={styles.reviewStars}>{"★".repeat(review.rating)}</Text>
      {review.text ? (
        <Text style={styles.reviewText} numberOfLines={2}>
          {review.text}
        </Text>
      ) : null}
      {review.photos.length > 0 ? (
        <View style={styles.photoRow}>
          {review.photos.slice(0, 4).map((photo) => (
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

export function ProductReviewsCard({ productId }: { productId: string }) {
  const [rating, setRating] = useState<ProductRatingSnapshot | null>(null);
  const [reviews, setReviews] = useState<ProductReviewDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (nextCursor?: string | null, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(false);
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
      } catch {
        setError(true);
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
      <View style={styles.wrap}>
        <Text style={styles.heading}>Отзывы</Text>
        <ActivityIndicator color={colors.ctaPrimary} />
      </View>
    );
  }

  const count = rating?.reviewsCount ?? reviews.length;
  const average = rating?.averageRating ?? null;
  const quality = average != null ? ratingQualityLabel(average) : null;
  const distribution = rating?.distribution ?? [];
  const hasDistribution = distribution.some((row) => row.percent > 0);
  const reviewPhotos = reviews.flatMap((r) => r.photos).slice(0, 3);

  if (!average && reviews.length === 0 && !error) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.heading}>Отзывы</Text>
        <Text style={styles.empty}>Отзывов пока нет</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Отзывы {count > 0 ? count : ""}</Text>

      {average != null && count > 0 ? (
        <View style={styles.summary}>
          <View style={styles.summaryLeft}>
            <Text style={styles.avgRating}>
              {average.toFixed(1)} <Text style={styles.avgStar}>★</Text>
            </Text>
            {quality ? <Text style={styles.quality}>{quality}</Text> : null}
          </View>

          {hasDistribution ? (
            <View style={styles.bars}>
              {[5, 4, 3, 2, 1].map((stars) => {
                const row = distribution.find((d) => d.stars === stars);
                return <StarBar key={stars} stars={stars} percent={row?.percent ?? 0} />;
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {reviewPhotos.length > 0 ? (
        <View style={styles.photoRow}>
          {reviewPhotos.map((photo) => {
            const config = loadAppConfig();
            return (
              <Image
                key={photo.id}
                source={{ uri: resolveImageUrl(photo.url, config.apiBaseUrl) ?? undefined }}
                style={styles.photo}
              />
            );
          })}
        </View>
      ) : null}

      {error ? <Text style={styles.empty}>Не удалось загрузить отзывы</Text> : null}

      {expanded
        ? reviews.map((review) => <ReviewPreview key={review.id} review={review} />)
        : reviews.slice(0, 2).map((review) => <ReviewPreview key={review.id} review={review} />)}

      {hasMore || reviews.length > 2 ? (
        <Pressable
          style={styles.allLink}
          onPress={() => {
            if (!expanded) {
              setExpanded(true);
              return;
            }
            if (hasMore) void load(cursor, true);
          }}
          disabled={loadingMore}
          accessibilityRole="button"
        >
          <Text style={styles.allLinkText}>
            {loadingMore ? "Загрузка…" : expanded && hasMore ? "Показать ещё" : "Все отзывы →"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  heading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.black,
  },
  summary: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "flex-start",
  },
  summaryLeft: {
    gap: 4,
    minWidth: 72,
  },
  avgRating: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "800",
    color: colors.black,
  },
  avgStar: {
    color: colors.ctaPrimary,
    fontSize: 30,
  },
  quality: {
    fontSize: 13,
    lineHeight: 18,
    color: "#8A8A8A",
  },
  bars: {
    flex: 1,
    gap: 6,
    paddingTop: 6,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barLabel: {
    width: 24,
    fontSize: 12,
    color: "#8A8A8A",
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#EFEFEF",
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: colors.ctaPrimary,
  },
  photoRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    backgroundColor: "#F5F5F5",
  },
  reviewItem: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  reviewStars: {
    color: colors.ctaPrimary,
    fontWeight: "700",
    fontSize: 13,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray900,
  },
  allLink: {
    alignSelf: "flex-start",
  },
  allLinkText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.ctaPrimary,
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    color: "#8A8A8A",
  },
});
