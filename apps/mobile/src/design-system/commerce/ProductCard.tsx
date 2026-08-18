import type { ReactNode } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { loadAppConfig } from "../../config/env";
import { usePressScale } from "../../hooks/usePressScale";
import { discountPercent, formatPrice, resolveImageUrl } from "../../utils/format";
import { Badge } from "../primitives/Badge";
import { colors } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

export type MobileProductCardData = {
  id: string;
  title: string;
  price: number;
  compareAt?: number | null;
  primaryImage?: { url: string } | null;
  seller?: { storeName?: string };
  stock?: number;
  status?: string;
  favoritesCount?: number;
  views?: number;
  city?: string | null;
};

export function ProductCard({
  product,
  onPress,
  onFavorite,
  onAddToCart,
  isFavorite,
  compact,
  width,
}: {
  product: MobileProductCardData;
  onPress?: () => void;
  onFavorite?: () => void;
  onAddToCart?: () => void;
  isFavorite?: boolean;
  compact?: boolean;
  width?: number | `${number}%`;
}) {
  const config = loadAppConfig();
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const imageUrl = resolveImageUrl(product.primaryImage?.url ?? null, config.apiBaseUrl);
  const discount = discountPercent(product.price, product.compareAt);
  const cardWidth = width ?? (compact ? 156 : "48%");
  const socialCount = product.favoritesCount ?? 0;
  const showDeliveryHint = Boolean(product.city?.trim());

  return (
    <Animated.View style={[{ width: cardWidth }, { transform: [{ scale }] }]}>
      <Pressable style={[styles.card, compact ? styles.cardCompact : null]} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View style={[styles.imageWrap, compact ? styles.imageWrapCompact : null]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.imageFallback}>
              <MaterialCommunityIcons name="shopping-outline" size={28} color={colors.orange} />
              <Text style={styles.imageFallbackText}>ЛОТ</Text>
            </View>
          )}

          {discount ? <Badge label={`-${discount}%`} tone="brand" style={styles.discountBadge} /> : null}
          {showDeliveryHint ? (
            <Badge label={product.city ?? "Доставка"} tone="neutral" style={styles.deliveryBadge} />
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
              <MaterialCommunityIcons name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? colors.danger : colors.black} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {product.compareAt && product.compareAt > product.price ? (
              <Text style={styles.compareAt}>{formatPrice(product.compareAt)}</Text>
            ) : null}
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>

          {product.seller?.storeName ? <Text style={styles.seller}>{product.seller.storeName}</Text> : null}

          <View style={styles.metaRow}>
            {socialCount > 0 ? <Text style={styles.social}>♥ {socialCount} в избранном</Text> : null}
            {(product.views ?? 0) > 0 ? <Text style={styles.views}>{product.views} просм.</Text> : null}
          </View>

          {onAddToCart ? (
            <Pressable
              style={styles.cta}
              onPress={(e) => {
                e.stopPropagation?.();
                onAddToCart();
              }}
              accessibilityLabel="В корзину"
            >
              <MaterialCommunityIcons name="cart-outline" size={16} color={colors.orange} />
              <Text style={styles.ctaText}>В корзину</Text>
            </Pressable>
          ) : null}
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
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: colors.orangeSoft },
  imageFallbackText: { ...typography.caption, color: colors.orange, fontWeight: "700" },
  discountBadge: { position: "absolute", top: spacing.sm, left: spacing.sm },
  deliveryBadge: { position: "absolute", bottom: spacing.sm, left: spacing.sm },
  favoriteBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  body: { padding: spacing.md, gap: spacing.xs },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
  price: { ...typography.h2, color: colors.black },
  compareAt: { ...typography.caption, color: colors.gray500, textDecorationLine: "line-through" },
  title: { ...typography.caption, color: colors.gray900, minHeight: 36 },
  seller: { ...typography.caption, color: colors.gray500 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap", minHeight: 18 },
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
  ctaText: { ...typography.buttonSm, color: colors.orange },
});
