import type { ProductDetail } from "../../domain/contracts/entities/catalog";
import type { MobileProductCardData } from "../../design-system/commerce/ProductCard";
import { discountPercent } from "../../utils/format";
import type { ProductDetailView } from "./types";

export function productDetailToView(entity: ProductDetail): ProductDetailView {
  const compareAt = entity.compareAt?.amount ?? null;
  return {
    id: entity.id,
    title: entity.title,
    description: entity.description,
    price: entity.price.amount,
    compareAt,
    discount: discountPercent(entity.price.amount, compareAt),
    stock: entity.stock,
    views: 0,
    favoritesCount: entity.favoritesCount,
    city: entity.city,
    condition: null,
    conditionLabel: null,
    brandName: null,
    pickupEnabled: false,
    images: entity.gallery.map((url) => ({ url })),
    characteristics: entity.specs.map((row) => ({ name: row.label, displayValue: row.value })),
    pickupPoints: [],
    seller: entity.sellerId
      ? {
          id: entity.sellerId,
          storeName: entity.sellerName ?? "Продавец",
          isVerified: false,
          productCount: null,
        }
      : null,
    categoryId: null,
    categoryName: null,
    highlights: [...entity.highlights],
    trustItems: entity.stock > 0 ? ["В наличии"] : ["Нет в наличии"],
  };
}

export function mergeSellerProductCountInView(product: ProductDetailView, count: number | null): ProductDetailView {
  if (!product.seller || count == null) return product;
  return { ...product, seller: { ...product.seller, productCount: count } };
}

export type RelatedProductView = MobileProductCardData;

export function relatedProductsToViews(products: ReadonlyArray<ProductDetail | import("../../domain/contracts/entities/catalog").ProductSummary>): RelatedProductView[] {
  return products.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price.amount,
    compareAt: p.compareAt?.amount ?? null,
    primaryImage: p.imageUrl ? { url: p.imageUrl } : null,
    seller: p.sellerName ? { storeName: p.sellerName } : undefined,
    stock: p.stock,
    favoritesCount: p.favoritesCount,
    city: p.city,
  }));
}
