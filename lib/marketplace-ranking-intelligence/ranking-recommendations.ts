import { ROUTES } from "@/lib/constants";

import type { RankingNextAction, RankingProductInput, RankingScoreBreakdown } from "./types";

export function pickNextBestAction(
  input: RankingProductInput,
  score: RankingScoreBreakdown,
): RankingNextAction | null {
  const photoFactor = score.factors.find((f) => f.factorKey === "photos");
  if (input.photoCount < 5) {
    return {
      title: "Добавьте ещё 3 фото",
      why: "Товары с 5+ фото получают до 27% выше CTR.",
      expectedGain: input.photoCount <= 2 ? 5 : 3,
      ctaLabel: "Редактировать товар",
      ctaHref: `${ROUTES.ACCOUNT_PRODUCTS}/${input.id}/edit`,
    };
  }

  if (!input.categoryId) {
    return {
      title: "Укажите категорию",
      why: "Без категории товар не участвует в релевантной выдаче.",
      expectedGain: 6,
      ctaLabel: "Исправить карточку",
      ctaHref: `${ROUTES.ACCOUNT_PRODUCTS}/${input.id}/edit`,
    };
  }

  if (input.descriptionLength < 80) {
    return {
      title: "Расширьте описание",
      why: "Подробное описание повышает доверие и конверсию.",
      expectedGain: 3,
      ctaLabel: "Редактировать описание",
      ctaHref: `${ROUTES.ACCOUNT_PRODUCTS}/${input.id}/edit`,
    };
  }

  const ctr = input.views > 0 ? input.favoritesCount / input.views : 0;
  if (ctr < 0.03 && photoFactor && photoFactor.score >= 70) {
    return {
      title: "Улучшите первое фото",
      why: "Первое фото формирует CTR в каталоге.",
      expectedGain: 4,
      ctaLabel: "Обновить фото",
      ctaHref: `${ROUTES.ACCOUNT_PRODUCTS}/${input.id}/edit`,
    };
  }

  if (score.commercial < 75 && input.compareAt == null) {
    return {
      title: "Сделайте цену конкурентнее",
      why: "Конкурентная цена улучшает коммерческий блок оценки.",
      expectedGain: 2,
      ctaLabel: "Изменить цену",
      ctaHref: `${ROUTES.ACCOUNT_PRODUCTS}/${input.id}/edit`,
    };
  }

  return null;
}
