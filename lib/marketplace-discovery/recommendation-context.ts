import type { ProductListItem } from "@/features/products/types";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";
import { getProductRatingSnapshot } from "@/lib/marketplace-trust-loop/ratings/product-rating";

import type { DiscoveryWhyReason } from "./types";

export async function buildWhyReasons(
  product: ProductListItem,
): Promise<DiscoveryWhyReason[]> {
  const reasons: DiscoveryWhyReason[] = [];

  if (product.views >= 40) {
    reasons.push({
      id: "popular",
      label: `${product.views} просмотров — товар внимания покупателей`,
    });
  }

  if (product.compareAt != null && product.compareAt > product.price) {
    const save = Math.round(
      ((product.compareAt - product.price) / product.compareAt) * 100,
    );
    reasons.push({
      id: "value",
      label: `Выгодная цена — скидка около ${save}%`,
    });
  }

  if (product.favoritesCount >= 5) {
    reasons.push({
      id: "favorites",
      label: `${product.favoritesCount} покупателей добавили в избранное`,
    });
  }

  if (isMarketplaceTrustLoopEnabled()) {
    const rating = await getProductRatingSnapshot(product.id);
    if (rating && rating.averageRating >= 4.5 && rating.reviewsCount > 0) {
      reasons.push({
        id: "rating",
        label: `Рейтинг ${rating.averageRating.toFixed(1)} · ${rating.reviewsCount} отзывов`,
      });
    }
  }

  if (product.stock > 0 && product.stock <= 5) {
    reasons.push({ id: "scarcity", label: "Осталось мало — успейте забрать" });
  }

  if (reasons.length === 0) {
    reasons.push({
      id: "curated",
      label: "Подобрано редакцией Находок ЛОТ",
    });
  }

  return reasons.slice(0, 4);
}

export async function enrichProductsWithReasons(
  products: ProductListItem[],
): Promise<Array<{ product: ProductListItem; reasons: DiscoveryWhyReason[] }>> {
  return Promise.all(
    products.map(async (product) => ({
      product,
      reasons: await buildWhyReasons(product),
    })),
  );
}
