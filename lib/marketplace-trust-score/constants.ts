export const NEW_SELLER_TRUST_SCORE = 70;
export const TRUST_SCORE_USER_LABEL = "Рейтинг доверия";
export const PRODUCT_TRUST_USER_LABEL = "Доверие к товару";

export const MAX_DAILY_TRUST_DELTA = 10;
export const MAX_EVENT_TRUST_DELTA = 5;

export const NEUTRAL_FACTOR_SCORE = 70;

export const SELLER_FACTOR_WEIGHTS = {
  productQuality: 20,
  orderFulfillment: 25,
  shippingSpeed: 20,
  reviews: 20,
  activity: 10,
  accountVerification: 5,
} as const;

export const PRODUCT_FACTOR_WEIGHTS = {
  productCard: 30,
  sellerTrust: 25,
  reviews: 25,
  delivery: 10,
  availability: 10,
} as const;

export const SELLER_FACTOR_LABELS: Record<keyof typeof SELLER_FACTOR_WEIGHTS, string> = {
  productQuality: "Качество товаров",
  orderFulfillment: "Выполнение заказов",
  shippingSpeed: "Скорость отправки",
  reviews: "Отзывы покупателей",
  activity: "Активность продавца",
  accountVerification: "Проверка аккаунта",
};

export type TrustLevelId = "high" | "good" | "needs_work" | "low";

export type TrustLevel = {
  id: TrustLevelId;
  min: number;
  max: number;
  label: string;
};

export const TRUST_LEVELS: TrustLevel[] = [
  { id: "high", min: 90, max: 100, label: "Высокий уровень доверия" },
  { id: "good", min: 70, max: 89, label: "Хороший уровень доверия" },
  { id: "needs_work", min: 50, max: 69, label: "Есть что улучшить" },
  { id: "low", min: 0, max: 49, label: "Низкий уровень доверия" },
];

export function clampTrustScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function getTrustLevel(score: number): TrustLevel {
  const normalized = clampTrustScore(score);
  return (
    TRUST_LEVELS.find((level) => normalized >= level.min && normalized <= level.max) ??
    TRUST_LEVELS[TRUST_LEVELS.length - 1]!
  );
}
