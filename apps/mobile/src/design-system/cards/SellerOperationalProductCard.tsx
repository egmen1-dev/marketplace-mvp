import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { memo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { loadAppConfig } from "../../config/env";
import { usePressScale } from "../../hooks/usePressScale";
import { formatPrice, resolveImageUrl } from "../../utils/format";
import { Badge } from "../primitives/Badge";
import { brand, border, surface, text } from "../tokens/colors";
import { layout } from "../tokens/layout";
import { radii } from "../tokens/radius";
import { shadows } from "../tokens/elevation";
import { spacing } from "../tokens/spacing";
import { typography } from "../tokens/typography";
import type { SellerOperationalProductView } from "../../features/seller/products/seller-products-view";

type Props = {
  product: SellerOperationalProductView;
  onPress?: () => void;
  onMenuPress?: () => void;
};

export const SellerOperationalProductCard = memo(function SellerOperationalProductCard({
  product,
  onPress,
  onMenuPress,
}: Props) {
  const config = loadAppConfig();
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);
  const imageUrl = resolveImageUrl(product.imageUrl, config.apiBaseUrl);

  const accessibilityLabel = [
    product.title,
    product.statusLabel,
    formatPrice(product.price),
    `Остаток ${product.stock}`,
  ].join(". ");

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.thumb}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbImage} contentFit="cover" recyclingKey={product.id} />
          ) : (
            <Text style={styles.thumbFallback}>📦</Text>
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>
          {product.sku ? <Text style={styles.sku}>SKU {product.sku}</Text> : null}
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          <View style={styles.meta}>
            <Badge label={product.statusLabel} tone={product.statusTone} />
            <Text style={styles.metaText}>Остаток {product.stock}</Text>
            {product.views > 0 ? <Text style={styles.metaText}>{product.views} просм.</Text> : null}
            {product.ordersCount > 0 ? <Text style={styles.metaText}>{product.ordersCount} продаж</Text> : null}
          </View>
          {product.moderationStatus ? (
            <View style={styles.moderationBox}>
              <Text style={styles.moderationTitle}>{product.moderationStatus}</Text>
              {product.moderationReason ? (
                <Text style={styles.moderationReason} numberOfLines={2}>
                  {product.moderationReason}
                </Text>
              ) : null}
            </View>
          ) : null}
          {product.isDraft ? (
            <Text style={styles.draftHint}>Черновик — требуется публикация или доработка</Text>
          ) : null}
          {product.isLowStock ? (
            <Text style={styles.lowStockHint}>Низкий остаток — обновите склад</Text>
          ) : null}
        </View>
        <Pressable
          style={styles.menuBtn}
          onPress={onMenuPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Действия для ${product.title}`}
        >
          <MaterialCommunityIcons name="dots-vertical" size={20} color={text.secondary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: surface.card,
    borderWidth: 1,
    borderColor: border.default,
    ...shadows.card,
    minHeight: layout.buttonHeight * 2,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: surface.backgroundMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbFallback: { fontSize: 28 },
  body: { flex: 1, gap: spacing.xs, paddingRight: spacing.sm },
  title: { ...typography.body, fontWeight: "600", color: text.primary },
  sku: { ...typography.caption, color: text.muted },
  price: { ...typography.body, fontWeight: "700", color: brand.primary },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  metaText: { ...typography.caption, color: text.muted },
  moderationBox: {
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: surface.backgroundMuted,
    gap: 2,
  },
  moderationTitle: { ...typography.caption, color: text.primary, fontWeight: "600" },
  moderationReason: { ...typography.caption, color: text.muted },
  draftHint: { ...typography.caption, color: text.secondary },
  lowStockHint: { ...typography.caption, color: brand.primary, fontWeight: "600" },
  menuBtn: {
    minWidth: layout.buttonHeight,
    minHeight: layout.buttonHeight,
    alignItems: "center",
    justifyContent: "center",
  },
});
