import type { SellerProductHealthRow } from "@/lib/seller-growth/seller-health";
import type {
  SellerInsight,
  SellerInsightCategory,
  SellerInsightSeverity,
} from "@/lib/seller-growth/types";

function insight(partial: SellerInsight): SellerInsight {
  return partial;
}

/** AI seller diagnostics — advisory only. */
export function generateSellerInsights(
  products: SellerProductHealthRow[],
): SellerInsight[] {
  const insights: SellerInsight[] = [];

  for (const product of products) {
    if (
      product.productViews >= 10 &&
      product.addToCart === 0 &&
      product.orderCount === 0
    ) {
      insights.push(
        insight({
          type: "CARD",
          severity: "HIGH",
          title: "Покупатели смотрят товар, но не покупают",
          reason: `${product.productViews} просмотров карточки, 0 добавлений в корзину`,
          action: "Добавьте больше фото, характеристики и преимущества",
          productId: product.id,
          productTitle: product.name,
        }),
      );
    }

    if (!product.ready && product.blockers.length > 0) {
      insights.push(
        insight({
          type: "CARD",
          severity: "HIGH",
          title: "Карточка товара не готова к продажам",
          reason: product.blockers.slice(0, 2).join("; "),
          action: "Исправьте карточку перед продвижением",
          productId: product.id,
          productTitle: product.name,
        }),
      );
    }

    if (product.stock === 0 && product.status === "ACTIVE") {
      insights.push(
        insight({
          type: "INVENTORY",
          severity: "HIGH",
          title: "Товар закончился на складе",
          reason: "Остаток 0 — покупатели не могут заказать",
          action: "Пополните остатки",
          productId: product.id,
          productTitle: product.name,
        }),
      );
    } else if (product.stock > 0 && product.stock <= 2) {
      insights.push(
        insight({
          type: "INVENTORY",
          severity: "MEDIUM",
          title: "Мало остатков",
          reason: `Осталось ${product.stock} шт. — риск потери продаж`,
          action: "Добавьте запас на склад",
          productId: product.id,
          productTitle: product.name,
        }),
      );
    }

    if (
      product.ready &&
      !product.isPromoted &&
      product.qualityScore >= 60 &&
      product.stock >= 3
    ) {
      insights.push(
        insight({
          type: "PROMOTION",
          severity: "MEDIUM",
          title: "Товар готов к продвижению",
          reason: "Карточка качественная, есть остатки",
          action: "Запустите продвижение для роста просмотров",
          productId: product.id,
          productTitle: product.name,
        }),
      );
    }
  }

  if (products.length === 1) {
    insights.push(
      insight({
        type: "ASSORTMENT",
        severity: "MEDIUM",
        title: "У вас только один товар",
        reason: "Широкий ассортимент повышает доверие и продажи",
        action: "Добавьте ещё 2–3 товара в каталог",
      }),
    );
  } else if (products.length < 3) {
    insights.push(
      insight({
        type: "ASSORTMENT",
        severity: "LOW",
        title: "Мало товаров в каталоге",
        reason: `${products.length} товар(а) — покупателям мало выбора`,
        action: "Создайте новые карточки в смежных категориях",
      }),
    );
  }

  const severityOrder: Record<SellerInsightSeverity, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };

  return insights.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
}

export function categoryLabel(type: SellerInsightCategory): string {
  const map: Record<SellerInsightCategory, string> = {
    CARD: "Карточка товара",
    PRICE: "Цена",
    INVENTORY: "Остатки",
    TRUST: "Доверие",
    PROMOTION: "Продвижение",
    ASSORTMENT: "Ассортимент",
  };
  return map[type];
}
