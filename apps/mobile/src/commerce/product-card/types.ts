import type { MobileProductListItem } from "../../api/endpoints";

export type ProductCardVariant = "grid" | "rail";

export type ProductCardProps = {
  variant: ProductCardVariant;
  product: MobileProductListItem;
  onPress: () => void;
  onFavorite: () => void;
  isFavorite: boolean;
  isFavoriteBusy?: boolean;
  onAddToCart?: () => void;
  onIncrementCart?: () => void;
  onDecrementCart?: () => void;
  cartQuantity?: number;
  isCartBusy?: boolean;
};

export function isProductOutOfStock(product: MobileProductListItem): boolean {
  if (typeof product.stock === "number") return product.stock <= 0;
  if (product.status === "SOLD" || product.status === "OUT_OF_STOCK") return true;
  return false;
}

export const PRODUCT_CARD_LAYOUT = {
  titleLines: 2,
  grid: {
    widthKey: "catalog",
    imageHeight: 148,
    cardHeight: 318,
    titleMinHeight: 38,
    priceRowHeight: 24,
    ratingHeight: 16,
    ctaHeight: 40,
  },
  rail: {
    widthKey: "home",
    imageHeight: 120,
    cardHeight: 286,
    titleMinHeight: 34,
    priceRowHeight: 22,
    ratingHeight: 16,
    ctaHeight: 36,
  },
} as const;
