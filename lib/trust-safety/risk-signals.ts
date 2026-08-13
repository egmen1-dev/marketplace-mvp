import { NEW_SELLER_DAYS, NEW_SELLER_MAX_COMPLETED_ORDERS } from "@/features/seller/lib/reputation";

import type { RiskSignal, RiskSignalType } from "./types";
import type { SellerTrustInput } from "./seller-trust";

export type ProductRiskInput = {
  imageCount: number;
  price: number;
  categoryMedianPrice?: number | null;
};

function signal(
  type: RiskSignalType,
  severity: RiskSignal["severity"],
  message: string,
  recommendation: string,
): RiskSignal {
  return { type, severity, message, recommendation };
}

/** Advisory risk signals — recommendations only, no automatic blocks. */
export function detectSellerRiskSignals(
  input: SellerTrustInput,
): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(input.joinedAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (
    accountAgeDays <= NEW_SELLER_DAYS &&
    input.completedOrders < NEW_SELLER_MAX_COMPLETED_ORDERS
  ) {
    signals.push(
      signal(
        "SELLER_NEW",
        "MEDIUM",
        "Продавец недавно на площадке",
        "Завершите первые продажи — это повысит доверие покупателей",
      ),
    );
  }

  if (input.totalOrders > 0) {
    const cancelRate = input.cancelledOrders / input.totalOrders;
    if (cancelRate > 0.3) {
      signals.push(
        signal(
          "HIGH_CANCEL_RATE",
          "HIGH",
          "Высокий процент отмен заказов",
          "Проверьте наличие и сроки — меньше отмен повышает доверие",
        ),
      );
    }

    const completionRate = input.completedOrders / input.totalOrders;
    if (completionRate < 0.5 && input.totalOrders >= 3) {
      signals.push(
        signal(
          "LOW_COMPLETION_RATE",
          "MEDIUM",
          "Мало завершённых заказов",
          "Доведите активные заказы до получения — покупатели смотрят на историю",
        ),
      );
    }
  }

  if (input.avgProductQuality < 55) {
    signals.push(
      signal(
        "NO_PRODUCT_PHOTO",
        "MEDIUM",
        "Слабые карточки товаров",
        "Добавьте фото и характеристики — это главный сигнал доверия",
      ),
    );
  }

  return signals;
}

export function detectProductRiskSignals(
  product: ProductRiskInput,
): RiskSignal[] {
  const signals: RiskSignal[] = [];

  if (product.imageCount === 0) {
    signals.push(
      signal(
        "NO_PRODUCT_PHOTO",
        "HIGH",
        "У товара нет фотографий",
        "Добавьте реальные фото — без них покупатели реже доверяют",
      ),
    );
  }

  if (
    product.categoryMedianPrice &&
    product.price > 0 &&
    product.price < product.categoryMedianPrice * 0.4
  ) {
    signals.push(
      signal(
        "PRICE_TOO_LOW",
        "LOW",
        "Цена заметно ниже похожих товаров",
        "Проверьте цену — слишком низкая может вызывать сомнения",
      ),
    );
  }

  return signals;
}
