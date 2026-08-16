import type { ReactNode } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { loadAppConfig } from "../../config/env";
import { formatPrice, resolveImageUrl } from "../../utils/format";
import { colors, radii, shadows, spacing, typography } from "../../theme/tokens";
import { Badge } from "./primitives";

export type MobileProductCardData = {
  id: string;
  title: string;
  price: number;
  compareAt?: number | null;
  primaryImage?: { url: string } | null;
  seller?: { storeName?: string };
  stock?: number;
  status?: string;
};

export function ProductCard({
  product,
  onPress,
  onFavorite,
  compact,
}: {
  product: MobileProductCardData;
  onPress?: () => void;
  onFavorite?: () => void;
  compact?: boolean;
}) {
  const config = loadAppConfig();
  const imageUrl = resolveImageUrl(product.primaryImage?.url ?? null, config.apiBaseUrl);

  return (
    <Pressable style={[styles.card, compact ? styles.cardCompact : null]} onPress={onPress}>
      <View style={[styles.imageWrap, compact ? styles.imageWrapCompact : null]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>ЛОТ</Text>
          </View>
        )}
        {onFavorite ? (
          <Pressable style={styles.favoriteBtn} onPress={onFavorite} hitSlop={8}>
            <Text style={styles.favoriteIcon}>♡</Text>
          </Pressable>
        ) : null}
        {product.stock === 0 ? <Badge label="Нет в наличии" tone="danger" style={styles.stockBadge} /> : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
        {product.compareAt && product.compareAt > product.price ? (
          <Text style={styles.compareAt}>{formatPrice(product.compareAt)}</Text>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        {product.seller?.storeName ? <Text style={styles.seller}>{product.seller.storeName}</Text> : null}
        <View style={styles.badges}>
          <Badge label="Доставка" tone="neutral" />
        </View>
      </View>
    </Pressable>
  );
}

export function ProductCardGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  cardCompact: { width: 140 },
  imageWrap: { aspectRatio: 1, backgroundColor: colors.gray100, position: "relative" },
  imageWrapCompact: { height: 140 },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageFallbackText: { ...typography.caption, color: colors.orange, fontWeight: "700" },
  favoriteBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteIcon: { fontSize: 16, color: colors.black },
  stockBadge: { position: "absolute", left: spacing.sm, bottom: spacing.sm },
  body: { padding: spacing.md, gap: spacing.xs },
  price: { ...typography.h2, color: colors.black },
  compareAt: { ...typography.caption, color: colors.gray500, textDecorationLine: "line-through" },
  title: { ...typography.caption, color: colors.gray900 },
  seller: { ...typography.caption, color: colors.gray500 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
});
