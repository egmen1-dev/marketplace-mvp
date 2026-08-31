import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileProductListItem } from "../api/endpoints";
import { loadAppConfig } from "../config/env";
import { discountPercent, formatPrice, resolveImageUrl } from "../utils/format";
import { colors, typography } from "../theme/tokens";
import { HOME_PRODUCT_CARD_WIDTH } from "./constants";
import { HomeProductRating } from "./HomeProductRating";

const CARD_HEIGHT = 244;
const IMAGE_HEIGHT = 120;

export function HomeProductCard({
  product,
  onPress,
  onFavorite,
  isFavorite,
}: {
  product: MobileProductListItem;
  onPress: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
}) {
  const config = loadAppConfig();
  const imageUrl = resolveImageUrl(product.primaryImage?.url ?? null, config.apiBaseUrl);
  const discount = discountPercent(product.price, product.compareAt);

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.imageFallback}>
            <MaterialCommunityIcons name="image-outline" size={28} color={colors.gray500} />
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
            size={17}
            color={isFavorite ? colors.danger : colors.black}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.priceRow}>
          <Text style={styles.price} numberOfLines={1}>
            {formatPrice(product.price)}
          </Text>
          {product.compareAt && product.compareAt > product.price ? (
            <Text style={styles.compareAt} numberOfLines={1}>
              {formatPrice(product.compareAt)}
            </Text>
          ) : null}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <HomeProductRating averageRating={product.averageRating} reviewsCount={product.reviewsCount} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: HOME_PRODUCT_CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E9E9E9",
    overflow: "hidden",
  },
  imageWrap: {
    height: IMAGE_HEIGHT,
    backgroundColor: "#FAFAFA",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
    justifyContent: "flex-start",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    minHeight: 22,
  },
  price: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.ctaPrimary,
    flexShrink: 0,
  },
  compareAt: {
    ...typography.caption,
    fontSize: 12,
    color: "#8A8A8A",
    textDecorationLine: "line-through",
    flexShrink: 1,
  },
  title: {
    fontSize: 13,
    lineHeight: 17,
    color: colors.black,
    minHeight: 34,
    fontWeight: "500",
  },
});
