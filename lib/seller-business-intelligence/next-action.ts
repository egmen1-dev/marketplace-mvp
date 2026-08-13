import { ROUTES, sellerProductEditPath } from "@/lib/constants";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";
import type { SellerDailyPriority } from "@/lib/seller-operations/types";
import type { SellerJourneyCoach } from "@/lib/seller-journey/types";

import type { NextBusinessAction } from "./types";

export function buildNextBusinessAction(input: {
  signals: SellerProgressSignals;
  topPriority: SellerDailyPriority | null;
  journeyCoach: SellerJourneyCoach | null;
  topProduct?: { id: string; name: string };
}): NextBusinessAction {
  if (input.topPriority) {
    return {
      id: input.topPriority.id,
      title: input.topPriority.title,
      why: input.topPriority.why,
      benefit: benefitForCategory(input.topPriority.category),
      ctaLabel: input.topPriority.ctaLabel,
      ctaHref: input.topPriority.ctaHref,
    };
  }

  if (input.journeyCoach) {
    return {
      id: "journey-next",
      title: input.journeyCoach.headline,
      why: input.journeyCoach.why,
      benefit: "Это следующий шаг на пути к первым продажам.",
      ctaLabel: input.journeyCoach.ctaLabel,
      ctaHref: input.journeyCoach.ctaHref,
    };
  }

  const { signals, topProduct } = input;

  if (signals.activeProducts === 0) {
    return {
      id: "create-product",
      title: "Создайте первый товар",
      why: "Без карточки покупатель не сможет оформить заказ.",
      benefit: "Карточка товара — ваша витрина на маркетплейсе.",
      ctaLabel: "Добавить товар",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
    };
  }

  if (signals.viewsSum > 0 && signals.ordersCount === 0 && topProduct) {
    return {
      id: "improve-card",
      title: `Добавьте фотографии товара «${topProduct.name}»`,
      why: `AI анализ: ${signals.viewsSum} просмотров, низкая конверсия, слабый Product Trust Score.`,
      benefit: "Покупателю будет проще принять решение.",
      ctaLabel: "Исправить",
      ctaHref: sellerProductEditPath(topProduct.id),
    };
  }

  if (signals.availableBalance > 0) {
    return {
      id: "withdraw",
      title: "Выведите доступные средства",
      why: `${signals.availableBalance.toLocaleString("ru-RU")} ₽ готовы к выводу.`,
      benefit: "Регулярный вывод помогает планировать денежный поток.",
      ctaLabel: "Вывести",
      ctaHref: ROUTES.ACCOUNT_PAYOUTS,
    };
  }

  return {
    id: "growth",
    title: "Улучшите карточки или запустите продвижение",
    why: "Сильные карточки и видимость — основа роста продаж.",
    benefit: "Покупатели быстрее находят и доверяют вашему магазину.",
    ctaLabel: "Получить рекомендации",
    ctaHref: ROUTES.ACCOUNT_GROWTH,
  };
}

function benefitForCategory(
  category: SellerDailyPriority["category"],
): string {
  switch (category) {
    case "order":
      return "Быстрая обработка заказов повышает доверие покупателей.";
    case "product":
      return "Покупателю будет проще принять решение.";
    case "inventory":
      return "Вы не потеряете продажи из-за нехватки товара.";
    case "promotion":
      return "Больше показов — больше шансов на заказ.";
    case "money":
      return "Деньги на счёте — результат вашей работы.";
    default:
      return "Это следующий лучший шаг для роста бизнеса.";
  }
}
