import { ROUTES, sellerProductEditPath } from "@/lib/constants";

import type { RiskSignal, TrustImprovement } from "./types";
import type { SellerTrustInput } from "./seller-trust";
import type { SellerTrustScore } from "./types";

export function buildSellerTrustImprovements(input: {
  trustInput: SellerTrustInput;
  trustScore: SellerTrustScore;
  riskSignals: RiskSignal[];
  weakProductId?: string | null;
}): TrustImprovement[] {
  const items: TrustImprovement[] = [];

  if (input.trustInput.avgProductQuality < 75) {
    items.push({
      id: "trust-photos",
      action: "Добавьте фото к товарам",
      why: "Покупатели смотрят карточку, но не видят товар",
      href: input.weakProductId
        ? sellerProductEditPath(input.weakProductId)
        : ROUTES.ACCOUNT_PRODUCTS,
    });
  }

  if (input.trustInput.avgProductQuality < 80) {
    items.push({
      id: "trust-characteristics",
      action: "Заполните характеристики",
      why: "Пустые характеристики вызывают сомнения в качестве",
      href: input.weakProductId
        ? sellerProductEditPath(input.weakProductId)
        : ROUTES.ACCOUNT_PRODUCTS,
    });
  }

  if (input.trustInput.completedOrders < 5) {
    items.push({
      id: "trust-first-sales",
      action: "Завершите первые продажи",
      why: "История завершённых заказов — главный сигнал доверия",
      href: ROUTES.ACCOUNT_SALES,
    });
  }

  if (!input.trustInput.isVerified) {
    items.push({
      id: "trust-verification",
      action: "Подтвердите профиль продавца",
      why: "Проверенные продавцы получают больше доверия",
      href: ROUTES.SETTINGS,
    });
  }

  for (const risk of input.riskSignals.slice(0, 2)) {
    items.push({
      id: `trust-risk-${risk.type.toLowerCase()}`,
      action: risk.recommendation,
      why: risk.message,
    });
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.action)) return false;
    seen.add(item.action);
    return true;
  }).slice(0, 5);
}

export function trustCoachSummary(score: SellerTrustScore): string {
  if (score.score >= 80) {
    return "Покупатели видят высокий уровень доверия — поддерживайте качество карточек и сервис.";
  }
  if (score.score >= 55) {
    return "Доверие формируется — улучшите карточки и завершайте заказы без отмен.";
  }
  return "Покупатели могут сомневаться — начните с фото, характеристик и первых продаж.";
}
