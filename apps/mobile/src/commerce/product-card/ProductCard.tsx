import { Pressable, StyleSheet, Text, View } from "react-native";

import { CATALOG_CARD_WIDTH } from "../../catalog/ui/constants";
import { HOME_PRODUCT_CARD_WIDTH } from "../../home/constants";
import { useCartQuantitiesStore } from "../cart-quantities-store";
import { colors } from "../../theme/tokens";
import { CommerceCartCta } from "./CommerceCartCta";
import { ProductCardImage, resolveProductCardDiscount, resolveProductCardImageUrl } from "./ProductCardImage";
import { ProductCardPrice } from "./ProductCardPrice";
import { isProductOutOfStock, PRODUCT_CARD_LAYOUT, type ProductCardProps } from "./types";

function ProductCardRating({
  averageRating,
  reviewsCount = 0,
  minHeight,
}: {
  averageRating?: number | null;
  reviewsCount?: number;
  minHeight: number;
}) {
  if (!averageRating || reviewsCount <= 0) {
    return <View style={{ minHeight }} />;
  }

  return (
    <View style={[styles.ratingRow, { minHeight }]}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.rating}>{averageRating.toFixed(1)}</Text>
      <Text style={styles.reviews}>{reviewsCount}</Text>
    </View>
  );
}

export function ProductCard({
  variant,
  product,
  onPress,
  onFavorite,
  isFavorite,
  isFavoriteBusy,
  onAddToCart,
  onIncrementCart,
  onDecrementCart,
  cartQuantity,
  isCartBusy,
}: ProductCardProps) {
  const layout = variant === "grid" ? PRODUCT_CARD_LAYOUT.grid : PRODUCT_CARD_LAYOUT.rail;
  const cardWidth = variant === "grid" ? CATALOG_CARD_WIDTH : HOME_PRODUCT_CARD_WIDTH;
  const imageUrl = resolveProductCardImageUrl(product.primaryImage?.url);
  const discount = resolveProductCardDiscount(product.price, product.compareAt);
  const storedQty = useCartQuantitiesStore((state) => state.quantities[product.id] ?? 0);
  const quantity = cartQuantity ?? storedQty;
  const outOfStock = isProductOutOfStock(product);
  const showCart = Boolean(onAddToCart && onIncrementCart && onDecrementCart);

  return (
    <Pressable
      style={[
        styles.card,
        variant === "grid" ? styles.cardGrid : styles.cardRail,
        { width: cardWidth, height: layout.cardHeight },
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <ProductCardImage
        imageUrl={imageUrl}
        height={layout.imageHeight}
        discount={discount}
        isFavorite={isFavorite}
        isFavoriteBusy={isFavoriteBusy}
        onFavorite={onFavorite}
        imageFit={variant === "grid" ? "contain" : "cover"}
      />

      <View style={[styles.body, variant === "grid" ? styles.bodyGrid : styles.bodyRail]}>
        <ProductCardPrice
          price={product.price}
          compareAt={product.compareAt}
          compact={variant === "rail"}
          rowHeight={layout.priceRowHeight}
        />

        <Text
          style={[styles.title, variant === "rail" ? styles.titleRail : styles.titleGrid, { minHeight: layout.titleMinHeight }]}
          numberOfLines={PRODUCT_CARD_LAYOUT.titleLines}
        >
          {product.title}
        </Text>

        <ProductCardRating
          averageRating={product.averageRating}
          reviewsCount={product.reviewsCount}
          minHeight={layout.ratingHeight}
        />

        {showCart ? (
          <View style={{ minHeight: layout.ctaHeight, justifyContent: "flex-end" }}>
            <CommerceCartCta
              quantity={quantity}
              onAdd={() => onAddToCart?.()}
              onIncrement={() => onIncrementCart?.()}
              onDecrement={() => onDecrementCart?.()}
              busy={isCartBusy}
              outOfStock={outOfStock}
              compact={variant === "rail"}
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E9E9EC",
    overflow: "hidden",
  },
  cardGrid: {
    borderRadius: 14,
  },
  cardRail: {
    borderRadius: 12,
  },
  body: {
    flex: 1,
    paddingHorizontal: 10,
    paddingBottom: 10,
    justifyContent: "flex-start",
  },
  bodyGrid: {
    paddingTop: 10,
    gap: 6,
  },
  bodyRail: {
    paddingTop: 8,
    gap: 4,
  },
  title: {
    color: "#171717",
    fontWeight: "500",
  },
  titleGrid: {
    fontSize: 14,
    lineHeight: 18,
  },
  titleRail: {
    fontSize: 13,
    lineHeight: 17,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  star: {
    color: colors.ctaPrimary,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },
  rating: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
    color: colors.black,
  },
  reviews: {
    fontSize: 12,
    lineHeight: 14,
    color: "#8A8A8A",
  },
});
