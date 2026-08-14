import { ROUTES } from "@/lib/constants";
import type { SellerMetricsInput } from "@/lib/marketplace-trust-score/calculator";

import type { TrustNextStep } from "./types";

export function buildTrustNextStep(metrics: SellerMetricsInput): TrustNextStep | null {
  const weakPhotoProducts = metrics.products.filter((p) => p.imageCount <= 1);
  if (weakPhotoProducts.length > 0) {
    return {
      title: "Добавьте фотографии к товару",
      why: `${weakPhotoProducts.length} ${pluralProducts(weakPhotoProducts.length)} имеют только одно фото.`,
      expectedEffect: "улучшение доверия к товарам",
      ctaLabel: "Исправить",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS,
    };
  }

  const weakDescription = metrics.products.filter((p) => p.descriptionLength < 30);
  if (weakDescription.length > 0) {
    return {
      title: "Дополните описание товаров",
      why: `${weakDescription.length} ${pluralProducts(weakDescription.length)} с коротким описанием.`,
      expectedEffect: "рост доверия к карточкам",
      ctaLabel: "Исправить",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS,
    };
  }

  if (!metrics.phoneVerified) {
    return {
      title: "Подтвердите телефон",
      why: "Покупатели чаще доверяют продавцам с подтверждёнными контактами.",
      expectedEffect: "рост проверки аккаунта",
      ctaLabel: "Исправить",
      ctaHref: ROUTES.SETTINGS,
    };
  }

  if (!metrics.paymentVerified) {
    return {
      title: "Добавьте реквизиты для выплат",
      why: "Подтверждённые реквизиты повышают доверие к магазину.",
      expectedEffect: "рост проверки аккаунта",
      ctaLabel: "Исправить",
      ctaHref: ROUTES.ACCOUNT_PAYOUTS,
    };
  }

  const avgShip =
    metrics.shippingHoursSamples.length > 0
      ? metrics.shippingHoursSamples.reduce((a, b) => a + b, 0) /
        metrics.shippingHoursSamples.length
      : null;

  if (avgShip != null && avgShip > 48) {
    return {
      title: "Отправляйте заказы быстрее",
      why: "Последние отправки заняли больше 2 дней.",
      expectedEffect: "рост скорости отправки",
      ctaLabel: "К заказам",
      ctaHref: ROUTES.ACCOUNT_ORDERS_SHIP,
    };
  }

  if (metrics.reviewsCount < 5) {
    return {
      title: "Попросите покупателей оставить отзыв",
      why: "Отзывы помогают новым покупателям доверять магазину.",
      expectedEffect: "рост блока отзывов",
      ctaLabel: "К продажам",
      ctaHref: ROUTES.ACCOUNT_SALES,
    };
  }

  return null;
}

function pluralProducts(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return "товар имеет";
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return "товара имеют";
  }
  return "товаров имеют";
}
