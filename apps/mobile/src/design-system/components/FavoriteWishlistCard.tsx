import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { memo } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { loadAppConfig } from "../../config/env";
import type { FavoriteProductView } from "../../features/favorites/types";
import { usePressScale } from "../../hooks/usePressScale";
import { discountPercent, formatPrice, resolveImageUrl } from "../../utils/format";
import { brand, semantic, surface, text } from "../tokens/colors";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";

type Props = {
  product: FavoriteProductView;
  onPress: () => void;
  onRemove: () => void;
  onAddToCart: () => void;
  removing?: boolean;
  cartBusy?: boolean;
};

export const FavoriteWishlistCard = memo(function FavoriteWishlistCard({
  product,
  onPress,
  onRemove,
  onAddToCart,
  removing,
  cartBusy,
}: Props) {
  const config = loadAppConfig();
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  const imageUrl = resolveImageUrl(product.primaryImage?.url ?? null, config.apiBaseUrl);
  const discount = discountPercent(product.price, product.compareAt);
  const hasCompare = Boolean(product.compareAt && product.compareAt > product.price);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }, removing && styles.removing]}>
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button" accessibilityLabel={`Открыть ${product.title}`}>
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={220} cachePolicy="memory-disk" />
          ) : (
            <View style={styles.imageFallback}>
              <MaterialCommunityIcons name="heart-outline" size={32} color={brand.primary} />
            </View>
          )}
          {discount ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>
          {product.sellerName ? <Text style={styles.seller}>{product.sellerName}</Text> : null}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {hasCompare ? <Text style={styles.compareAt}>{formatPrice(product.compareAt!)}</Text> : null}
          </View>
        </View>
      </Pressable>

      <Pressable
        style={styles.removeBtn}
        onPress={onRemove}
        disabled={removing}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Удалить из избранного"
      >
        {removing ? (
          <ActivityIndicator size="small" color={semantic.danger} />
        ) : (
          <MaterialCommunityIcons name="heart" size={20} color={semantic.danger} />
        )}
      </Pressable>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cartBtn, cartBusy && styles.cartBtnBusy]}
          onPress={onAddToCart}
          disabled={cartBusy}
          accessibilityRole="button"
          accessibilityLabel="Добавить в корзину"
        >
          {cartBusy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="cart-outline" size={18} color="#fff" />
              <Text style={styles.cartBtnText}>В корзину</Text>
            </>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: surface.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    ...shadows.card,
    position: "relative",
  },
  removing: { opacity: 0.6 },
  imageWrap: { height: 168, backgroundColor: surface.backgroundMuted },
  image: { width: "100%", height: "100%" },
  imageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  discountBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: semantic.danger,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  discountText: { ...typography.caption, color: "#fff", fontWeight: "700" },
  removeBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.sm },
  title: { ...typography.body, color: text.primary, fontWeight: "700", minHeight: 40 },
  seller: { ...typography.caption, color: text.muted },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  price: { ...typography.subtitle, color: brand.primary, fontWeight: "800" },
  compareAt: { ...typography.caption, color: text.muted, textDecorationLine: "line-through" },
  footer: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  cartBtn: {
    minHeight: 44,
    borderRadius: radii.lg,
    backgroundColor: brand.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  cartBtnBusy: { opacity: 0.7 },
  cartBtnText: { ...typography.bodySmall, color: "#fff", fontWeight: "700" },
});
