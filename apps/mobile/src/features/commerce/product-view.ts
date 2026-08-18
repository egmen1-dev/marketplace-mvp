import type { MobileProductCardData } from "../../design-system/commerce/ProductCard";
import type { ProductSummary } from "../../domain/contracts/entities/catalog";

/** Domain entity → UI card model. DTO never reaches UI. */
export function productSummaryToCardView(product: ProductSummary): MobileProductCardData {
  return {
    id: product.id,
    title: product.title,
    price: product.price.amount,
    compareAt: product.compareAt?.amount ?? null,
    primaryImage: product.imageUrl ? { url: product.imageUrl } : null,
    seller: product.sellerName ? { storeName: product.sellerName } : undefined,
    stock: product.stock,
    favoritesCount: product.favoritesCount,
    city: product.city,
  };
}

export function productSummariesToCardViews(products: ReadonlyArray<ProductSummary>): MobileProductCardData[] {
  return products.map(productSummaryToCardView);
}
