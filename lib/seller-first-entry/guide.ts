import { ROUTES } from "@/lib/constants";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import type { SellerFirstEntryGuide, SellerFirstEntryStep } from "./types";

export function buildSellerFirstEntryGuide(input: {
  step: SellerFirstEntryStep;
  signals: SellerProgressSignals;
}): SellerFirstEntryGuide {
  const { step, signals } = input;
  const qualityScore = signals.bestCompletenessScore;

  switch (step) {
    case "SELLER_START":
      return {
        headline: "Создайте первый товар",
        why: "У вас пока нет опубликованных товаров.",
        actions: ["Добавьте: ✓ название", "✓ фото", "✓ цену"],
        ctaLabel: "Создать товар",
        ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
        tone: "info",
      };
    case "PRODUCT_CREATED":
      return {
        headline: "Опубликуйте товар",
        why: "Черновик не виден покупателям в каталоге.",
        actions: ["Проверьте цену и остаток", "Опубликуйте карточку"],
        ctaLabel: "Открыть товары",
        ctaHref: ROUTES.ACCOUNT_PRODUCTS,
        tone: "info",
      };
    case "PRODUCT_PUBLISHED":
      return {
        headline: "Сделать карточку сильнее",
        why: `Качество карточки: ${qualityScore} / 100`,
        actions: [
          qualityScore < 70 ? "❌ мало фотографий" : "✓ фото добавлены",
          qualityScore < 70 ? "❌ нет характеристик" : "✓ характеристики заполнены",
        ],
        ctaLabel: "Улучшить карточку",
        ctaHref: ROUTES.ACCOUNT_PRODUCTS,
        qualityScore,
        tone: "warning",
      };
    case "CARD_IMPROVED":
      return {
        headline: "Получить первые просмотры",
        why: "Товар опубликован — теперь нужен трафик.",
        actions: [
          "✓ проверить цену",
          "✓ добавить преимущества",
          "✓ рассмотреть продвижение",
        ],
        ctaLabel: "Открыть продвижение",
        ctaHref: ROUTES.ACCOUNT_PROMOTION_CENTER,
        qualityScore,
        tone: "info",
      };
    case "FIRST_VIEWS":
      return {
        headline: "Получите первый заказ",
        why: "Просмотры есть — усилите карточку и доверие.",
        actions: ["Проверьте цену", "Ответьте на сообщения быстрее"],
        ctaLabel: "Открыть товары",
        ctaHref: ROUTES.ACCOUNT_PRODUCTS,
        tone: "info",
      };
    case "FIRST_ORDER":
      return {
        headline: "Поздравляем! 🎉",
        why: "Вы получили первый заказ.",
        actions: [
          "После завершения сделки деньги станут доступны для вывода.",
        ],
        ctaLabel: "Открыть баланс",
        ctaHref: ROUTES.ACCOUNT_BALANCE,
        tone: "success",
      };
    case "BALANCE_AVAILABLE":
      return {
        headline: "Деньги доступны",
        why: `Доступно к выводу: ${signals.availableBalance.toLocaleString("ru-RU")} ₽`,
        actions: ["Создайте заявку на вывод в разделе «Деньги»"],
        ctaLabel: "Вывести деньги",
        ctaHref: ROUTES.ACCOUNT_PAYOUTS,
        tone: "success",
      };
    case "FIRST_PAYOUT":
      return {
        headline: "Путь пройден 🎉",
        why: "Вы прошли путь от первого товара до выплаты.",
        actions: ["Масштабируйте ассортимент", "Используйте AI помощник"],
        ctaLabel: "AI помощник",
        ctaHref: ROUTES.ACCOUNT_COMMAND_CENTER,
        tone: "success",
      };
    default:
      return {
        headline: "Ваш следующий шаг",
        why: "Следуйте подсказкам в кабинете.",
        actions: [],
        ctaLabel: "Продолжить",
        ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
        tone: "info",
      };
  }
}
