import { ROUTES } from "@/lib/constants";

import type { SellerProgressSignals } from "./progress";
import type { SellerJourneyCoach, SellerLifecycleStage } from "./types";

export function buildSellerJourneyCoach(input: {
  stage: SellerLifecycleStage;
  signals: SellerProgressSignals;
  productId?: string | null;
}): SellerJourneyCoach {
  const { stage, signals } = input;

  if (stage === "NOT_STARTED" || stage === "SELLER_ACTIVATED") {
    return {
      headline: "У вас пока нет товаров",
      body: "Первый шаг — создать карточку.",
      bullets: [
        "Без товара покупатели не смогут вас найти",
        "Мы поможем с фото и характеристиками",
      ],
      ctaLabel: "Создать товар",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
      tone: "info",
    };
  }

  if (
    stage === "FIRST_PRODUCT_CREATED" ||
    stage === "FIRST_PRODUCT_PUBLISHED" ||
    stage === "PRODUCT_OPTIMIZED"
  ) {
    if (signals.ordersCount === 0) {
      return {
        headline: "Ваш товар опубликован",
        body: "Что мешает продажам:",
        bullets: [
          "Добавьте фотографии",
          "Заполните характеристики",
          "Проверьте цену",
        ],
        ctaLabel: "Улучшить товар",
        ctaHref: ROUTES.ACCOUNT_PRODUCTS,
        tone: "warning",
      };
    }
  }

  if (stage === "FIRST_VIEWS" || stage === "FIRST_CART") {
    return {
      headline: "Пока нет заказов",
      body: "Что можно улучшить:",
      bullets: [
        "○ качество карточки",
        "○ цену",
        "○ продвижение",
      ],
      ctaLabel: "Посмотреть рекомендации",
      ctaHref: ROUTES.ACCOUNT_COMMAND_CENTER,
      tone: "info",
    };
  }

  if (stage === "FIRST_ORDER") {
    return {
      headline: "Поздравляем!",
      body: "У вас появились первые заказы.",
      bullets: [
        "✓ улучшить карточку",
        "✓ запустить продвижение",
        "✓ добавить ассортимент",
      ],
      ctaLabel: "Открыть продажи",
      ctaHref: ROUTES.ACCOUNT_SALES,
      tone: "success",
    };
  }

  if (stage === "ORDER_COMPLETED" && signals.pendingBalance > 0) {
    return {
      headline: "Сделка завершена",
      body: "Средства находятся в ожидании подтверждения.",
      bullets: [
        `После завершения доступно к выводу: ${signals.availableBalance.toLocaleString("ru-RU")} ₽`,
      ],
      ctaLabel: "Открыть баланс",
      ctaHref: ROUTES.ACCOUNT_BALANCE,
      tone: "info",
    };
  }

  if (stage === "BALANCE_AVAILABLE") {
    return {
      headline: "Ваши средства готовы",
      body: `Доступно: ${signals.availableBalance.toLocaleString("ru-RU")} ₽`,
      bullets: ["Создайте заявку на вывод — администратор обработает её вручную"],
      ctaLabel: "Вывести деньги",
      ctaHref: ROUTES.ACCOUNT_PAYOUTS,
      tone: "success",
    };
  }

  if (stage === "FIRST_PAYOUT" || stage === "GROWING_SELLER") {
    return {
      headline: "Продвижение работает",
      body: "Вы прошли путь до первой выплаты.",
      bullets: [
        "✓ масштабируйте ассортимент",
        "✓ улучшайте карточки",
        "✓ используйте продвижение",
      ],
      ctaLabel: "AI помощник",
      ctaHref: ROUTES.ACCOUNT_COMMAND_CENTER,
      tone: "success",
    };
  }

  return {
    headline: "Ваш путь продавца",
    body: "Следуйте подсказкам — мы сопровождаем до первой выплаты.",
    bullets: [],
    ctaLabel: "Следующий шаг",
    ctaHref: ROUTES.ACCOUNT_COMMAND_CENTER,
    tone: "info",
  };
}

export function buildEmptyStateCopy(context: "products" | "orders" | "payouts"): {
  title: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
} {
  switch (context) {
    case "products":
      return {
        title: "Создайте первый товар",
        body: "Мы поможем:",
        bullets: [
          "✓ сделать карточку",
          "✓ добавить фото",
          "✓ подготовить продажу",
        ],
        ctaLabel: "Создать товар",
        ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
      };
    case "orders":
      return {
        title: "Пока нет заказов",
        body: "Что можно улучшить:",
        bullets: ["○ качество карточки", "○ цену", "○ продвижение"],
        ctaLabel: "Посмотреть рекомендации",
        ctaHref: ROUTES.ACCOUNT_COMMAND_CENTER,
      };
    case "payouts":
      return {
        title: "Первая выплата появится после завершения сделки",
        body: "Ваш путь:",
        bullets: ["Продажа → Подтверждение → Баланс → Вывод"],
        ctaLabel: "Открыть баланс",
        ctaHref: ROUTES.ACCOUNT_BALANCE,
      };
  }
}
