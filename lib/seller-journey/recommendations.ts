import { ROUTES } from "@/lib/constants";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import { buildCoachCta, buildStepMessage } from "./messages";
import type { SellerJourneyCoach, SellerJourneyStep } from "./types";

export function buildSellerJourneyCoach(input: {
  step: SellerJourneyStep;
  signals: SellerProgressSignals;
}): SellerJourneyCoach {
  const message = buildStepMessage(input);
  const cta = buildCoachCta(input.step);

  return {
    headline: message.headline,
    why: message.why,
    body: message.why,
    bullets: message.actions,
    ctaLabel: cta.ctaLabel,
    ctaHref: cta.ctaHref,
    tone: cta.tone,
  };
}

export function buildEmptyStateCopy(
  context: "products" | "orders" | "payouts",
): {
  title: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
} {
  switch (context) {
    case "products":
      return {
        title: "Начните продавать",
        body: "Создайте первый товар. Мы поможем:",
        bullets: [
          "✓ оформить карточку",
          "✓ добавить фото",
          "✓ подготовить продажу",
        ],
        ctaLabel: "Создать товар",
        ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
      };
    case "orders":
      return {
        title: "Пока нет заказов",
        body: "Проверьте:",
        bullets: [
          "✓ качество карточки",
          "✓ цену",
          "✓ доверие покупателей",
          "✓ продвижение",
        ],
        ctaLabel: "Получить рекомендации",
        ctaHref: ROUTES.ACCOUNT_GROWTH,
      };
    case "payouts":
      return {
        title: "Первая выплата появится после успешной сделки",
        body: "Ваш путь:",
        bullets: ["Продажа → Завершение сделки → Баланс → Вывод денег"],
        ctaLabel: "Открыть баланс",
        ctaHref: ROUTES.ACCOUNT_BALANCE,
      };
  }
}
