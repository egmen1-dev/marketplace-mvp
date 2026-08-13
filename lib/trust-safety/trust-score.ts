/**
 * SellerTrustScore 0–100 — display / education only.
 * Does NOT feed catalog ranking or search.
 */
export type SellerTrustScoreInput = {
  ordersCompleted: number;
  disputesOpened: number;
  /** Average first-response hours; null if unknown */
  responseTimeHours: number | null;
  /** Product completeness average 0–100; null if unknown */
  productQualityAvg: number | null;
  accountAgeDays: number;
  isVerified: boolean;
};

export type SellerTrustScoreResult = {
  score: number;
  label: string;
  factors: Array<{ key: string; label: string; points: number; max: number }>;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeSellerTrustScore(
  input: SellerTrustScoreInput,
): SellerTrustScoreResult {
  const ordersPts = clamp(input.ordersCompleted * 4, 0, 30);
  const disputeRate =
    input.ordersCompleted > 0
      ? input.disputesOpened / input.ordersCompleted
      : input.disputesOpened > 0
        ? 1
        : 0;
  const disputePts = clamp(
    Math.round(25 * (1 - Math.min(1, disputeRate * 4))),
    0,
    25,
  );

  let responsePts = 10;
  if (input.responseTimeHours != null) {
    if (input.responseTimeHours <= 4) responsePts = 15;
    else if (input.responseTimeHours <= 24) responsePts = 12;
    else if (input.responseTimeHours <= 72) responsePts = 8;
    else responsePts = 4;
  }

  const qualityPts =
    input.productQualityAvg != null
      ? clamp(Math.round((input.productQualityAvg / 100) * 15), 0, 15)
      : 7;

  const agePts = clamp(Math.round(input.accountAgeDays / 18), 0, 10);
  const verifiedPts = input.isVerified ? 5 : 0;

  const score = clamp(
    ordersPts + disputePts + responsePts + qualityPts + agePts + verifiedPts,
    0,
    100,
  );

  const label =
    score >= 80
      ? "Надёжный продавец"
      : score >= 55
        ? "Хороший продавец"
        : score >= 30
          ? "Новый продавец"
          : "Мало данных";

  return {
    score,
    label,
    factors: [
      {
        key: "orders_completed",
        label: "Завершённые заказы",
        points: ordersPts,
        max: 30,
      },
      { key: "dispute_rate", label: "Споры", points: disputePts, max: 25 },
      {
        key: "response_time",
        label: "Скорость ответа",
        points: responsePts,
        max: 15,
      },
      {
        key: "product_quality",
        label: "Качество карточек",
        points: qualityPts,
        max: 15,
      },
      {
        key: "account_age",
        label: "Возраст аккаунта",
        points: agePts,
        max: 10,
      },
      { key: "verified", label: "Проверка", points: verifiedPts, max: 5 },
    ],
  };
}
