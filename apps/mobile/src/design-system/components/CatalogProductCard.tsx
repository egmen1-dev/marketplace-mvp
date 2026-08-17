import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { loadAppConfig } from "../../config/env";
import { usePressScale } from "../../hooks/usePressScale";
import { discountPercent, formatPrice, resolveImageUrl } from "../../utils/format";
import { brand, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import type { MobileProductListItem } from "../../api/endpoints";

const CARD_IMAGE_HEIGHT = 168;

export type CatalogProductCardProps = {
  product: MobileProductListItem;
  onPress?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
};

export const CatalogProductCard = memo(function CatalogProductCard({
  product,
  onPress,
  onFavorite,
  isFavorite,
}: CatalogProductCardProps) {
  const config = loadAppConfig();
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  const imageUrl = resolveImageUrl(product.primaryImage?.url ?? null, config.apiBaseUrl);
  const discount = discountPercent(product.price, product.compareAt);
  const hasCompare = Boolean(product.compareAt && product.compareAt > product.price);

  return (
    <Pressable
      style={[styles.card, { transform: [{ scale }] }]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`${product.title}, ${formatPrice(product.price)}`}
    >
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={220} cachePolicy="memory-disk" />
        ) : (
          <View style={styles.imageFallback}>
            <MaterialCommunityIcons name="shopping-outline" size={28} color={brand.primary} />
            <Text style={styles.imageFallbackText}>ЛОТ</Text>
          </View>
        )}
        {discount ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        ) : null}
        {onFavorite ? (
          <Pressable
            style={styles.favoriteBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onFavorite();
            }}
            hitSlop={8}
            accessibilityLabel="Избранное"
          >
            <MaterialCommunityIcons
              name={isFavorite ? "heart" : "heart-outline"}
              size={18}
              color={isFavorite ? "#DC2626" : text.primary}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          {hasCompare ? <Text style={styles.compareAt}>{formatPrice(product.compareAt!)}</Text> : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        {product.seller?.storeName ? (
          <Text style={styles.seller} numberOfLines={1}>
            {product.seller.storeName}
          </Text>
        ) : (
          <Text style={styles.sellerPlaceholder}> </Text>
        )}
      </View>
    </Pressable>
  );
});

export function CatalogGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonBody}>
            <View style={styles.skeletonLineShort} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLineTiny} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    maxWidth: "48%",
    backgroundColor: surface.background,
    borderRadius: radii.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  imageWrap: {
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: surface.backgroundMuted,
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: brand.primarySoft,
  },
  imageFallbackText: { ...typography.caption, color: brand.primary, fontWeight: "700" },
  discountBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: brand.primary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  discountText: { ...typography.caption, color: text.inverse, fontWeight: "700" },
  favoriteBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: surface.background,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  body: { padding: spacing.md, gap: spacing.xs, minHeight: 96 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, minHeight: 24 },
  price: { ...typography.h3, color: text.primary },
  compareAt: { ...typography.caption, color: text.muted, textDecorationLine: "line-through" },
  title: { ...typography.caption, color: text.primary, minHeight: 36, fontWeight: "600" },
  seller: { ...typography.caption, color: text.muted, minHeight: 16 },
  sellerPlaceholder: { minHeight: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
  skeletonCard: {
    width: "48%",
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: surface.background,
  },
  skeletonImage: { height: CARD_IMAGE_HEIGHT, backgroundColor: surface.backgroundMuted },
  skeletonBody: { padding: spacing.md, gap: spacing.sm },
  skeletonLineShort: { height: 14, width: "45%", borderRadius: radii.sm, backgroundColor: surface.backgroundMuted },
  skeletonLine: { height: 14, borderRadius: radii.sm, backgroundColor: surface.backgroundMuted },
  skeletonLineTiny: { height: 12, width: "60%", borderRadius: radii.sm, backgroundColor: surface.backgroundMuted },
});
