import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileProductListItem } from "../../api/endpoints";
import { useCartQuantitiesStore } from "../../commerce/cart-quantities-store";
import { loadAppConfig } from "../../config/env";
import { discountPercent, formatPrice, resolveImageUrl } from "../../utils/format";
import { colors, typography } from "../../theme/tokens";
import { CatalogCartCta } from "./CatalogCartCta";
import { CATALOG_CARD_WIDTH } from "./constants";
import { CatalogProductRating } from "./CatalogProductRating";

const CARD_HEIGHT = 318;
const IMAGE_HEIGHT = 148;
const TITLE_MIN_HEIGHT = 38;
const PRICE_ROW_HEIGHT = 24;
const RATING_HEIGHT = 16;
const CTA_HEIGHT = 40;

export function CatalogProductCard({
  product,
  onPress,
  onFavorite,
  onAddToCart,
  onIncrementCart,
  onDecrementCart,
  isFavorite,
  cartQuantity,
}: {
  product: MobileProductListItem;
  onPress: () => void;
  onFavorite: () => void;
  onAddToCart: () => void;
  onIncrementCart: () => void;
  onDecrementCart: () => void;
  isFavorite: boolean;
  cartQuantity?: number;
}) {
  const config = loadAppConfig();
  const imageUrl = resolveImageUrl(product.primaryImage?.url ?? null, config.apiBaseUrl);
  const discount = discountPercent(product.price, product.compareAt);
  const storedQty = useCartQuantitiesStore((s) => s.quantities[product.id] ?? 0);
  const quantity = cartQuantity ?? storedQty;

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="contain" transition={200} />
        ) : (
          <View style={styles.imageFallback}>
            <MaterialCommunityIcons name="image-outline" size={32} color={colors.gray500} />
          </View>
        )}
        {discount ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        ) : null}
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
            color={isFavorite ? colors.danger : "#8A8A8A"}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={[styles.priceRow, { minHeight: PRICE_ROW_HEIGHT }]}>
          <Text style={styles.price} numberOfLines={1}>
            {formatPrice(product.price)}
          </Text>
          {product.compareAt && product.compareAt > product.price ? (
            <Text style={styles.compareAt} numberOfLines={1}>
              {formatPrice(product.compareAt)}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.title, { minHeight: TITLE_MIN_HEIGHT }]} numberOfLines={2}>
          {product.title}
        </Text>

        <View style={{ minHeight: RATING_HEIGHT }}>
          <CatalogProductRating averageRating={product.averageRating} reviewsCount={product.reviewsCount} />
        </View>

        <View style={{ minHeight: CTA_HEIGHT, justifyContent: "flex-end" }}>
          <CatalogCartCta
            quantity={quantity}
            onAdd={onAddToCart}
            onIncrement={onIncrementCart}
            onDecrement={onDecrementCart}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CATALOG_CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    overflow: "hidden",
  },
  imageWrap: {
    height: IMAGE_HEIGHT,
    backgroundColor: "#FAFAFA",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  discountBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    minHeight: 20,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: colors.ctaPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  discountText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: colors.white,
  },
  favoriteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 6,
    justifyContent: "flex-start",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  price: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    color: colors.ctaPrimary,
    flexShrink: 0,
  },
  compareAt: {
    ...typography.caption,
    fontSize: 13,
    color: "#8A8A8A",
    textDecorationLine: "line-through",
    flexShrink: 1,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.black,
    fontWeight: "500",
  },
});
