import type { ReactNode } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { loadAppConfig } from "../../config/env";
import { usePressScale } from "../../hooks/usePressScale";
import { discountPercent, formatPrice, resolveImageUrl } from "../../utils/format";
import { colors, layout, radii, shadows, spacing, typography } from "../../theme/tokens";
import { Badge } from "./primitives";
import { ProductRatingRow } from "./ProductRatingRow";

export type MobileProductCardData = {
  id: string;
  title: string;
  price: number;
  compareAt?: number | null;
  primaryImage?: { url: string } | null;
  seller?: { storeName?: string; id?: string };
  stock?: number;
  status?: string;
  favoritesCount?: number;
  views?: number;
  averageRating?: number | null;
  reviewsCount?: number;
  city?: string | null;
};

export function ProductCard({
  product,
  onPress,
  onFavorite,
  onAddToCart,
  onSellerPress,
  isFavorite,
  compact,
  width,
  reserveFavoriteSlot = true,
}: {
  product: MobileProductCardData;
  onPress?: () => void;
  onFavorite?: () => void;
  onAddToCart?: () => void;
  onSellerPress?: () => void;
  isFavorite?: boolean;
  compact?: boolean;
  width?: number | `${number}%`;
  /** Keeps grid alignment when favorite handler is absent. */
  reserveFavoriteSlot?: boolean;
}) {
  const config = loadAppConfig();
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const imageUrl = resolveImageUrl(product.primaryImage?.url ?? null, config.apiBaseUrl);
  const discount = discountPercent(product.price, product.compareAt);
  const cardWidth = width ?? (compact ? 156 : "48%");
  const socialCount = product.favoritesCount ?? 0;
  const showFavorite = reserveFavoriteSlot || Boolean(onFavorite);

  return (
    <Animated.View style={[{ width: cardWidth }, { transform: [{ scale }] }]}>
      <Pressable style={[styles.card, compact ? styles.cardCompact : null]} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={[styles.imageWrap, compact ? styles.imageWrapCompact : null]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.imageFallbackText}>ЛОТ</Text>
            </View>
          )}

          {discount ? <Badge label={`-${discount}%`} tone="brand" style={styles.discountBadge} /> : null}
          <Badge label="Доставка" tone="neutral" style={styles.deliveryBadge} />

          {showFavorite ? (
            <View style={styles.favoriteSlot}>
              {onFavorite ? (
                <Pressable
                  style={styles.favoriteBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onFavorite();
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
                >
                  <MaterialCommunityIcons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={18}
                    color={isFavorite ? colors.danger : colors.black}
                  />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            <Text style={[styles.compareAt, product.compareAt && product.compareAt > product.price ? null : styles.compareAtHidden]}>
              {product.compareAt && product.compareAt > product.price ? formatPrice(product.compareAt) : " "}
            </Text>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>

          <View style={styles.ratingSlot}>
            <ProductRatingRow averageRating={product.averageRating} reviewsCount={product.reviewsCount} compact />
          </View>

          <View style={styles.sellerSlot}>
            {product.seller?.storeName ? (
              onSellerPress ? (
                <Pressable onPress={(e) => { e.stopPropagation?.(); onSellerPress(); }} hitSlop={4}>
                  <Text style={[styles.seller, styles.sellerLink]} numberOfLines={1}>
                    {product.seller.storeName}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.seller} numberOfLines={1}>
                  {product.seller.storeName}
                </Text>
              )
            ) : (
              <Text style={styles.sellerHidden}> </Text>
            )}
          </View>

          <Text style={[styles.location, product.city ? null : styles.locationHidden]} numberOfLines={1}>
            {product.city ?? " "}
          </Text>

          <View style={styles.metaRow}>
            {socialCount > 0 ? <Text style={styles.social}>♥ {socialCount} в избранном</Text> : <Text style={styles.metaPlaceholder}> </Text>}
            {(product.views ?? 0) > 0 ? <Text style={styles.views}>{product.views} просм.</Text> : null}
          </View>

          {onAddToCart ? (
            <Pressable
              style={styles.cta}
              onPress={(e) => {
                e.stopPropagation?.();
                onAddToCart();
              }}
              accessibilityRole="button"
              accessibilityLabel="В корзину"
            >
              <MaterialCommunityIcons name="cart-outline" size={16} color={colors.orange} />
              <Text style={styles.ctaText}>В корзину</Text>
            </Pressable>
          ) : (
            <View style={styles.ctaPlaceholder} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ProductCardGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  cardCompact: {},
  imageWrap: { aspectRatio: 0.92, backgroundColor: colors.gray100, position: "relative" },
  imageWrapCompact: { height: 156 },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageFallbackText: { ...typography.caption, color: colors.orange, fontWeight: "700" },
  discountBadge: { position: "absolute", top: spacing.sm, left: spacing.sm },
  deliveryBadge: { position: "absolute", bottom: spacing.sm, left: spacing.sm },
  favoriteSlot: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
  },
  favoriteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  body: { padding: spacing.md, gap: spacing.xs },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap", minHeight: 24 },
  price: { ...typography.h2, color: colors.black },
  compareAt: { ...typography.caption, color: colors.gray500, textDecorationLine: "line-through" },
  compareAtHidden: { opacity: 0 },
  title: { ...typography.caption, color: colors.gray900, minHeight: 36 },
  ratingSlot: { minHeight: 18, justifyContent: "center" },
  sellerSlot: { minHeight: 18, justifyContent: "center" },
  seller: { ...typography.caption, color: colors.gray500 },
  sellerLink: { color: colors.orange, fontWeight: "600" },
  sellerHidden: { ...typography.caption, opacity: 0 },
  location: { ...typography.caption, color: colors.gray500 },
  locationHidden: { opacity: 0 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap", minHeight: 18 },
  metaPlaceholder: { ...typography.caption, opacity: 0 },
  social: { ...typography.caption, color: colors.gray700, fontWeight: "600" },
  views: { ...typography.caption, color: colors.gray500 },
  cta: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: layout.buttonHeightSm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.orangeSoft,
    backgroundColor: colors.orangeSoft,
  },
  ctaPlaceholder: { minHeight: layout.buttonHeightSm + spacing.xs, marginTop: spacing.xs },
  ctaText: { ...typography.buttonSm, color: colors.orange },
});
