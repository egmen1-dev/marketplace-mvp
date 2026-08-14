import { ROUTES, sellerProductEditPath } from "@/lib/constants";

import type { ConversionDropOff } from "./drop-offs";

export type ConversionRecommendation = {
  id: string;
  problem: string;
  why: string;
  data: string;
  action: string;
  ctaLabel?: string;
  ctaHref?: string;
  checks?: string[];
};

export function recommendationsFromDropOff(
  dropOff: ConversionDropOff,
  productId?: string,
): ConversionRecommendation {
  const checks =
    dropOff.id === "pdp-to-cart" || dropOff.id === "product-dropoff"
      ? [
          "✓ фото",
          "✓ цену",
          "✓ доверие продавца",
          "✓ отзывы",
          "✓ описание",
        ]
      : undefined;

  return {
    id: dropOff.id,
    problem: dropOff.headline,
    why: dropOff.detail,
    data:
      dropOff.rate != null
        ? `Конверсия ${dropOff.rate}% на этапе ${dropOff.stage}`
        : dropOff.detail,
    action:
      dropOff.id === "cart-to-checkout"
        ? "Упростите checkout и покажите доставку заранее"
        : dropOff.id === "checkout-to-payment"
          ? "Проверьте способы оплаты и ошибки Stripe"
          : "Улучшите карточку товара: фото, цена, доверие",
    ctaLabel: productId ? "Исправить карточку" : undefined,
    ctaHref: productId ? sellerProductEditPath(productId) : undefined,
    checks,
  };
}

export function sellerConversionRecommendation(input: {
  views: number;
  cartAdds: number;
  orders: number;
  topProductId?: string;
  topProductName?: string;
}): ConversionRecommendation | null {
  if (input.views < 20) return null;
  const cartRate =
    input.views > 0 ? Math.round((input.cartAdds / input.views) * 1000) / 10 : 0;

  if (cartRate >= 10 && input.orders > 0) return null;

  return {
    id: "seller-view-to-sale",
    problem: "Ваши товары смотрят, но редко покупают",
    why: "Недостаточно сигналов доверия или слабая первая карточка",
    data: `${input.views} просмотров · ${input.cartAdds} корзин · ${input.orders} заказов`,
    action: input.topProductName
      ? `Улучшите первое фото «${input.topProductName}»`
      : "Улучшите первое фото лидера просмотров",
    ctaLabel: input.topProductId ? "Исправить" : "Открыть товары",
    ctaHref: input.topProductId
      ? sellerProductEditPath(input.topProductId)
      : ROUTES.ACCOUNT_PRODUCTS,
  };
}

export function adminGrowthOpportunity(input: {
  productId: string;
  title: string;
  views: number;
  purchases: number;
}): ConversionRecommendation | null {
  if (input.views < 30 || input.purchases >= 5) return null;
  const rate =
    input.views > 0
      ? Math.round((input.purchases / input.views) * 1000) / 10
      : 0;
  if (rate >= 5) return null;

  return {
    id: `growth-${input.productId}`,
    problem: "Потенциал роста",
    why: "Много просмотров — мало покупок",
    data: `${input.views} просмотров · ${input.purchases} покупок (${rate}%)`,
    action: "Оптимизируйте PDP: фото, отзывы, цена",
    ctaLabel: "Открыть товар",
    ctaHref: `${ROUTES.PRODUCT}/${input.productId}`,
  };
}
