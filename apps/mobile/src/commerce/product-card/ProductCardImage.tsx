import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { loadAppConfig } from "../../config/env";
import { discountPercent, resolveImageUrl } from "../../utils/format";
import { colors } from "../../theme/tokens";

export function ProductCardImage({
  imageUrl,
  height,
  discount,
  isFavorite,
  isFavoriteBusy,
  onFavorite,
  imageFit = "cover",
}: {
  imageUrl: string | null;
  height: number;
  discount: number | null;
  isFavorite: boolean;
  isFavoriteBusy?: boolean;
  onFavorite: () => void;
  imageFit?: "cover" | "contain";
}) {
  return (
    <View style={[styles.wrap, { height }]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} contentFit={imageFit} transition={200} />
      ) : (
        <View style={styles.fallback}>
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
        onPress={(event) => {
          event.stopPropagation?.();
          onFavorite();
        }}
        disabled={isFavoriteBusy}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
        accessibilityState={{ disabled: Boolean(isFavoriteBusy) }}
      >
        {isFavoriteBusy ? (
          <ActivityIndicator size="small" color={colors.ctaPrimary} />
        ) : (
          <MaterialCommunityIcons
            name={isFavorite ? "heart" : "heart-outline"}
            size={17}
            color={isFavorite ? colors.danger : colors.black}
          />
        )}
      </Pressable>
    </View>
  );
}

export function resolveProductCardImageUrl(primaryImageUrl?: string | null): string | null {
  const config = loadAppConfig();
  return resolveImageUrl(primaryImageUrl ?? null, config.apiBaseUrl);
}

export function resolveProductCardDiscount(price: number, compareAt?: number | null): number | null {
  return discountPercent(price, compareAt);
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FAFAFA",
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
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
});
