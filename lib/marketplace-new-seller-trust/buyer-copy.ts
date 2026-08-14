import type { SellerMetricsInput } from "@/lib/marketplace-trust-score/calculator";

import { APP_NAME } from "@/lib/constants";

export function buildFirstBuyerExperienceLines(input: {
  metrics: SellerMetricsInput;
  productHasQualityCard: boolean;
}): string[] {
  const lines = [`Этот продавец начинает работу на ${APP_NAME}.`, "Мы отслеживаем качество:"];

  if (input.metrics.isVerified || input.metrics.phoneVerified) {
    lines.push("✓ подтверждён аккаунт");
  }
  if (input.productHasQualityCard) {
    lines.push("✓ товар проверен");
  }
  lines.push("✓ доставка через ЛОТ");

  return lines;
}

export function buildBuyerProtectionLines(): string[] {
  return [
    "✓ Оплата через ЛОТ",
    "✓ Отслеживание доставки",
    "✓ Возможность оставить отзыв",
  ];
}

export function buildFirstReviewPrompt(productName: string): string {
  return `Вы первый покупатель товара «${productName}». Помогите другим сделать выбор — оставьте отзыв.`;
}

export function productHasQualityCard(input: {
  imageCount: number;
  hasPrimary: boolean;
  descriptionLength: number;
}): boolean {
  return input.hasPrimary && input.imageCount >= 1 && input.descriptionLength >= 10;
}
