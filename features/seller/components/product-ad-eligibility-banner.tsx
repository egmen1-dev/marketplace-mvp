"use client";

import { AlertTriangle } from "lucide-react";

import {
  adEligibilityFixChecklist,
  buildProductAdSnapshot,
  cardQualityTier,
  type ProductAdSnapshotSource,
} from "@/lib/product-advertising";

type ProductAdEligibilityBannerProps = {
  source: ProductAdSnapshotSource;
};

export function ProductAdEligibilityBanner({
  source,
}: ProductAdEligibilityBannerProps) {
  const { eligibility, quality } = buildProductAdSnapshot(source);

  if (eligibility.eligible && quality.score >= 75) {
    return null;
  }

  const checklist = adEligibilityFixChecklist(eligibility.reasons);
  const tier = cardQualityTier(quality.score);

  return (
    <div
      className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"
      role="status"
      data-testid="product-ad-eligibility-banner"
    >
      <div className="flex gap-3">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-amber-600"
          aria-hidden
        />
        <div className="space-y-2">
          <p className="font-medium text-foreground">
            Карточка не готова к продвижению
          </p>
          <p className="text-sm text-muted-foreground">
            Quality score: {quality.score}/100 ({tier}). Исправьте пункты ниже,
            чтобы товар можно было рекламировать.
          </p>
          {checklist.length > 0 ? (
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              <li>Добавить фото</li>
              <li>Заполнить характеристики</li>
              <li>Указать остаток</li>
              <li>Выбрать категорию</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
