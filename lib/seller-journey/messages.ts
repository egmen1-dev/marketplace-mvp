import { ROUTES } from "@/lib/constants";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import {
  hasViewsWithoutOrders,
  resolveSellerJourneyStep,
} from "./progress";
import type { SellerJourneyCoach, SellerJourneyStep } from "./types";

/** Step-specific headline + «why» copy for journey card sections. */
export function buildStepMessage(input: {
  step: SellerJourneyStep;
  signals: SellerProgressSignals;
}): { headline: string; why: string; actions: string[] } {
  const { step, signals } = input;
  const score = signals.bestCompletenessScore;

  switch (step) {
    case "NOT_STARTED":
    case "SELLER_STARTED":
      return {
        headline: "Создайте первый товар",
        why: "Без карточки покупатели не смогут найти ваш товар.",
        actions: [
          "✓ создать карточку",
          "✓ добавить фото",
          "✓ заполнить характеристики",
        ],
      };
    case "FIRST_PRODUCT_CREATED":
      return {
        headline: "Опубликуйте товар",
        why: "Черновик не виден покупателям в каталоге.",
        actions: ["Проверьте цену и остаток", "Опубликуйте карточку"],
      };
    case "PRODUCT_PUBLISHED":
      return {
        headline: "Сделать карточку сильнее",
        why: `Качество карточки: ${score} / 100. Хорошая карточка получает больше доверия покупателей.`,
        actions: [
          score < 70 ? "○ Добавить фотографии" : "✓ фото добавлены",
          score < 70 ? "○ Заполнить характеристики" : "✓ характеристики заполнены",
          "○ Добавить преимущества",
          "○ Проверить цену",
        ],
      };
    case "PRODUCT_READY":
      return {
        headline: "Получить первые просмотры",
        why: "Товар опубликован — теперь нужно привлечь покупателей.",
        actions: [
          "✓ улучшить видимость",
          "✓ проверить категорию",
          "✓ рассмотреть продвижение",
        ],
      };
    case "FIRST_VISITS":
    case "FIRST_CART":
      if (hasViewsWithoutOrders(signals)) {
        return {
          headline: "Покупатели смотрят товар, но пока не покупают",
          why: "Возможные причины: мало информации, недостаточно доверия или цена выше ожиданий.",
          actions: [
            "✓ мало информации",
            "✓ недостаточно доверия",
            "✓ цена выше ожиданий",
          ],
        };
      }
      return {
        headline: "Получите первый заказ",
        why: "Просмотры есть — усилите карточку и доверие.",
        actions: ["Проверьте цену", "Ответьте на сообщения быстрее"],
      };
    case "FIRST_ORDER":
      return {
        headline: "Поздравляем! 🎉 Первый заказ!",
        why: "После завершения сделки деньги перейдут на баланс.",
        actions: [
          "✓ отправьте заказ",
          "✓ дождитесь завершения",
          "✓ получите деньги",
        ],
      };
    case "ORDER_COMPLETED":
      return {
        headline: "Средства ожидаются",
        why: "Покупатель оплатил. После завершения сделки средства станут доступны для вывода.",
        actions: ["Откройте баланс и следите за статусом"],
      };
    case "BALANCE_AVAILABLE":
      return {
        headline: "Ваши деньги готовы",
        why: `Доступно к выводу: ${signals.availableBalance.toLocaleString("ru-RU")} ₽`,
        actions: ["Создайте заявку на вывод в разделе «Деньги»"],
      };
    case "FIRST_PAYOUT":
    case "GROWING_SELLER":
      return {
        headline: "Ваш магазин развивается",
        why: "Следующий шаг — увеличить количество продаж.",
        actions: [
          "✓ добавить ассортимент",
          "✓ использовать продвижение",
          "✓ улучшить лучшие товары",
        ],
      };
    default:
      return {
        headline: "Ваш следующий шаг",
        why: "Следуйте подсказкам в кабинете.",
        actions: [],
      };
  }
}

export function buildCoachCta(step: SellerJourneyStep): {
  ctaLabel: string;
  ctaHref: string;
  tone: SellerJourneyCoach["tone"];
} {
  switch (step) {
    case "NOT_STARTED":
    case "SELLER_STARTED":
    case "FIRST_PRODUCT_CREATED":
      return {
        ctaLabel: "Создать товар",
        ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
        tone: "info",
      };
    case "PRODUCT_PUBLISHED":
      return {
        ctaLabel: "Улучшить карточку",
        ctaHref: ROUTES.ACCOUNT_PRODUCTS,
        tone: "warning",
      };
    case "PRODUCT_READY":
    case "FIRST_VISITS":
    case "FIRST_CART":
      return {
        ctaLabel: "Получить рекомендации",
        ctaHref: ROUTES.ACCOUNT_GROWTH,
        tone: "info",
      };
    case "FIRST_ORDER":
    case "ORDER_COMPLETED":
      return {
        ctaLabel: "Открыть заказы",
        ctaHref: ROUTES.ACCOUNT_SALES,
        tone: "success",
      };
    case "BALANCE_AVAILABLE":
      return {
        ctaLabel: "Вывести деньги",
        ctaHref: ROUTES.ACCOUNT_PAYOUTS,
        tone: "success",
      };
    case "FIRST_PAYOUT":
    case "GROWING_SELLER":
      return {
        ctaLabel: "AI помощник",
        ctaHref: ROUTES.ACCOUNT_COMMAND_CENTER,
        tone: "success",
      };
    default:
      return {
        ctaLabel: "Продолжить",
        ctaHref: ROUTES.ACCOUNT_GROWTH,
        tone: "info",
      };
  }
}

export function buildStepMessageFromSignals(
  signals: SellerProgressSignals,
): ReturnType<typeof buildStepMessage> {
  return buildStepMessage({ step: resolveSellerJourneyStep(signals), signals });
}
