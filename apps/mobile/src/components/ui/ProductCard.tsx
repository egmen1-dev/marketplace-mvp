import type { ReactNode } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { useCartQuantitiesStore } from "../../commerce/cart-quantities-store";
import { loadAppConfig } from "../../config/env";
import { usePressScale } from "../../hooks/usePressScale";
import { discountPercent, formatPrice, resolveImageUrl } from "../../utils/format";
import { colors, radii, shadows, spacing, typography } from "../../theme/tokens";
import { PRODUCT_CARD_LAYOUT } from "./product-card-layout";
import { Badge } from "./primitives";
import { ProductCartCta } from "./ProductCartCta";
import { ProductImageFallback } from "./ProductImageFallback";
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
  onIncrementCart,
  onDecrementCart,
  onSellerPress,
  isFavorite,
  compact,
  width,
  reserveFavoriteSlot = true,
  cartQuantity,
}: {
  product: MobileProductCardData;
  onPress?: () => void;
  onFavorite?: () => void;
  onAddToCart?: () => void;
  onIncrementCart?: () => void;
  onDecrementCart?: () => void;
  onSellerPress?: () => void;
  isFavorite?: boolean;
  compact?: boolean;
  width?: number | `${number}%`;
  reserveFavoriteSlot?: boolean;
  /** When omitted, reads from cart quantities store. */
  cartQuantity?: number;
}) {
  const config = loadAppConfig();
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const imageUrl = resolveImageUrl(product.primaryImage?.url ?? null, config.apiBaseUrl);
  const discount = discountPercent(product.price, product.compareAt);
  const cardWidth = width ?? (compact ? 156 : "48%");
  const socialCount = product.favoritesCount ?? 0;
  const showFavorite = reserveFavoriteSlot || Boolean(onFavorite);
  const storedQty = useCartQuantitiesStore((s) => s.quantities[product.id] ?? 0);
  const quantity = cartQuantity ?? storedQty;
  const hasRating = (product.averageRating ?? 0) > 0 || (product.reviewsCount ?? 0) > 0;
  const showCommerceCta = Boolean(onAddToCart);

  return (
    <Animated.View style={[{ width: cardWidth, flexGrow: 1 }, { transform: [{ scale }] }]}>
      <Pressable style={[styles.card, compact ? styles.cardCompact : null]} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={[styles.imageWrap, compact ? styles.imageWrapCompact : null]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <ProductImageFallback compact={compact} />
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
          <View style={styles.content}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatPrice(product.price)}</Text>
              {product.compareAt && product.compareAt > product.price ? (
                <Text style={styles.compareAt}>{formatPrice(product.compareAt)}</Text>
              ) : null}
            </View>

            <Text style={styles.title} numberOfLines={PRODUCT_CARD_LAYOUT.titleLines}>
              {product.title}
            </Text>

            {hasRating ? (
              <ProductRatingRow averageRating={product.averageRating} reviewsCount={product.reviewsCount} compact />
            ) : null}

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
            ) : null}

            {product.city ? (
              <Text style={styles.location} numberOfLines={1}>
                {product.city}
              </Text>
            ) : null}

            {(socialCount > 0 || (product.views ?? 0) > 0) ? (
              <View style={styles.metaRow}>
                <Text style={styles.social} numberOfLines={1}>
                  {socialCount > 0 ? `♥ ${socialCount} в избранном` : ""}
                </Text>
                <Text style={styles.views} numberOfLines={1}>
                  {(product.views ?? 0) > 0 ? `${product.views} просм.` : ""}
                </Text>
              </View>
            ) : null}
          </View>

          {showCommerceCta ? (
            <ProductCartCta
              quantity={quantity}
              onAdd={() => onAddToCart?.()}
              onIncrement={() => onIncrementCart?.()}
              onDecrement={() => onDecrementCart?.()}
            />
          ) : (
            <View style={styles.ctaSpacer} />
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
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  cardCompact: {},
  imageWrap: { aspectRatio: PRODUCT_CARD_LAYOUT.imageAspectRatio, backgroundColor: colors.gray100, position: "relative" },
  imageWrapCompact: { height: 156 },
  image: { width: "100%", height: "100%" },
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
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    justifyContent: "space-between",
    gap: spacing.sm,
    minHeight: PRODUCT_CARD_LAYOUT.bodyMinHeight,
  },
  content: { gap: 2 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
  price: { ...typography.price, color: colors.black },
  compareAt: { ...typography.caption, color: colors.gray500, textDecorationLine: "line-through" },
  title: { ...typography.caption, color: colors.gray900, minHeight: PRODUCT_CARD_LAYOUT.titleMinHeight, lineHeight: 18 },
  seller: { ...typography.caption, color: colors.gray500, marginTop: 2 },
  sellerLink: { color: colors.orange, fontWeight: "600" },
  location: { ...typography.caption, color: colors.gray500 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: 2 },
  social: { ...typography.caption, color: colors.gray700, fontWeight: "600", flex: 1 },
  views: { ...typography.caption, color: colors.gray500, textAlign: "right", minWidth: 56 },
  ctaSpacer: { minHeight: PRODUCT_CARD_LAYOUT.ctaMinHeight },
});
