import { ROUTES } from "@/lib/constants";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import type { FirstSellerJourneyStep } from "./types";

export function buildFirstSellerJourney(
  signals: SellerProgressSignals,
): FirstSellerJourneyStep[] {
  return [
    {
      id: "product",
      step: 1,
      label: "Создать первый товар",
      explanation:
        "Карточка товара — ваша витрина. Покупатель принимает решение именно здесь.",
      done: signals.totalProducts > 0,
      href: ROUTES.ACCOUNT_PRODUCTS_NEW,
    },
    {
      id: "photos",
      step: 2,
      label: "Добавить фотографии",
      explanation: "Первое, что видит покупатель — изображение.",
      done: signals.bestCompletenessScore >= 50,
      href: ROUTES.ACCOUNT_PRODUCTS,
    },
    {
      id: "attributes",
      step: 3,
      label: "Заполнить характеристики",
      explanation: "Характеристики помогают покупателям найти ваш товар.",
      done: signals.bestCompletenessScore >= 70,
      href: ROUTES.ACCOUNT_PRODUCTS,
    },
    {
      id: "views",
      step: 4,
      label: "Получить первые просмотры",
      explanation: "Просмотры — сигнал интереса покупателей.",
      done: signals.viewsSum > 0,
      href: ROUTES.ACCOUNT_GROWTH,
    },
    {
      id: "order",
      step: 5,
      label: "Получить первую продажу",
      explanation: "Первая продажа подтверждает спрос на ваш товар.",
      done: signals.ordersCount > 0,
      href: ROUTES.ACCOUNT_SALES,
    },
    {
      id: "money",
      step: 6,
      label: "Получить деньги",
      explanation:
        "Оплата → защита сделки → подтверждение → доступный баланс → вывод.",
      done: signals.availableBalance > 0 || signals.paidAmount > 0,
      href: ROUTES.ACCOUNT_BALANCE,
    },
  ];
}
