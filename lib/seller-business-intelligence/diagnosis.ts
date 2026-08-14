import { ROUTES } from "@/lib/constants";
import type { ProductAttentionItem } from "@/lib/seller-operations/types";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import type { GrowthProblem } from "./types";

export function buildGrowthDiagnosis(input: {
  signals: SellerProgressSignals;
  products: ProductAttentionItem[];
  weakCardCount: number;
  lowStockCount: number;
  promotionReadyCount: number;
}): GrowthProblem[] {
  const problems: GrowthProblem[] = [];
  const { signals } = input;

  if (input.weakCardCount > 0 || input.products.some((p) => p.type === "weak_card")) {
    const count = Math.max(
      input.weakCardCount,
      input.products.filter((p) => p.type === "weak_card").length,
    );
    problems.push({
      id: "problem-cards",
      category: "product_cards",
      title: `${count} товар(ов) теряют продажи из-за слабых карточек`,
      explanation: "Отсутствуют фото, мало характеристик или слабое описание.",
      ctaLabel: "Улучшить карточки",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS,
    });
  }

  if (signals.viewsSum >= 20 && signals.ordersCount === 0) {
    problems.push({
      id: "problem-sales",
      category: "sales",
      title: `Ваш товар смотрят ${signals.viewsSum} человек, но покупают редко`,
      explanation:
        "Возможно, покупателю не хватает доверия или информации.",
      ctaLabel: "Проверить товар",
      ctaHref: input.products[0]?.ctaHref ?? ROUTES.ACCOUNT_PRODUCTS,
    });
  }

  const noSalesProduct = input.products.find((p) => p.type === "no_sales");
  if (noSalesProduct && signals.viewsSum >= 10) {
    problems.push({
      id: "problem-price",
      category: "price",
      title: "Проверьте цену и конверсию",
      explanation:
        "При просмотрах без заказов цена или доверие могут мешать покупке.",
      ctaLabel: "Проверить цену",
      ctaHref: noSalesProduct.ctaHref,
    });
  }

  if (input.lowStockCount > 0 || input.products.some((p) => p.type === "low_stock")) {
    const stockItem = input.products.find((p) => p.type === "low_stock");
    problems.push({
      id: "problem-inventory",
      category: "inventory",
      title: stockItem
        ? `Товар «${stockItem.productName}» заканчивается`
        : "Товар заканчивается — вы можете потерять продажи",
      explanation: stockItem?.reason ?? "Пополните остатки заранее.",
      ctaLabel: "Пополнить остатки",
      ctaHref: stockItem?.ctaHref ?? ROUTES.ACCOUNT_PRODUCTS,
    });
  }

  if (input.promotionReadyCount > 0) {
    problems.push({
      id: "problem-promotion",
      category: "promotion",
      title: `${input.promotionReadyCount} товар(ов) готовы к продвижению`,
      explanation:
        "✓ хороший рейтинг карточки ✓ есть спрос ✓ есть остатки",
      ctaLabel: "Запустить продвижение",
      ctaHref: ROUTES.ACCOUNT_PROMOTION_CENTER,
    });
  } else if (
    signals.activeProducts > 0 &&
    signals.bestCompletenessScore >= 70 &&
    signals.viewsSum > 0 &&
    signals.promotionCampaigns === 0
  ) {
    problems.push({
      id: "problem-promotion-potential",
      category: "promotion",
      title: "Товар показывает потенциал для продвижения",
      explanation: "✓ есть просмотры ✓ хорошая карточка ✓ конкурентная цена",
      ctaLabel: "Запустить продвижение",
      ctaHref: ROUTES.ACCOUNT_PROMOTION_CENTER,
    });
  }

  return problems.slice(0, 5);
}

export function countWeakCards(products: ProductAttentionItem[]): number {
  return products.filter((p) => p.type === "weak_card").length;
}

export function countPromotionReady(input: {
  signals: SellerProgressSignals;
  products: ProductAttentionItem[];
}): number {
  if (input.signals.promotionCampaigns > 0) return 0;
  return input.products.filter(
    (p) => p.type !== "weak_card" && p.type !== "no_sales",
  ).length >= 1 && input.signals.bestCompletenessScore >= 70 && input.signals.viewsSum > 0
    ? Math.min(2, input.signals.activeProducts)
    : 0;
}
