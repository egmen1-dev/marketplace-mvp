/**
 * ProductCompletenessScore — listing quality for seller/admin UX.
 * NOT used in search ranking.
 */

export type CompletenessInput = {
  photoCount: number;
  titleLength: number;
  descriptionLength: number;
  characteristicCount: number;
  hasCategory: boolean;
  hasProductType?: boolean;
  price: number;
  hasSeller: boolean;
};

export type CompletenessFactor = {
  key:
    | "photos"
    | "title"
    | "description"
    | "characteristics"
    | "category"
    | "price"
    | "seller";
  label: string;
  max: number;
  score: number;
  ok: boolean;
  hint: string;
};

export type CompletenessResult = {
  score: number;
  factors: CompletenessFactor[];
  improvements: string[];
};

const WEIGHTS = {
  photos: 25,
  title: 15,
  description: 10,
  characteristics: 20,
  category: 10,
  price: 10,
  seller: 10,
} as const;

export function computeProductCompletenessScore(
  input: CompletenessInput,
): CompletenessResult {
  const factors: CompletenessFactor[] = [];

  const photoScore =
    input.photoCount >= 3
      ? WEIGHTS.photos
      : input.photoCount === 2
        ? 18
        : input.photoCount === 1
          ? 12
          : 0;
  factors.push({
    key: "photos",
    label: "Фото",
    max: WEIGHTS.photos,
    score: photoScore,
    ok: input.photoCount >= 1,
    hint:
      input.photoCount === 0
        ? "Добавьте фото"
        : input.photoCount < 3
          ? "Добавьте ещё фото (лучше 3+)"
          : "Фото в порядке",
  });

  const titleOk = input.titleLength >= 8;
  const titleScore = titleOk
    ? input.titleLength >= 20
      ? WEIGHTS.title
      : 10
    : input.titleLength > 0
      ? 5
      : 0;
  factors.push({
    key: "title",
    label: "Название",
    max: WEIGHTS.title,
    score: titleScore,
    ok: titleOk,
    hint: titleOk ? "Название ок" : "Уточните название товара",
  });

  const descOk = input.descriptionLength >= 40;
  const descScore =
    input.descriptionLength >= 120
      ? WEIGHTS.description
      : input.descriptionLength >= 40
        ? 7
        : input.descriptionLength > 0
          ? 3
          : 0;
  factors.push({
    key: "description",
    label: "Описание",
    max: WEIGHTS.description,
    score: descScore,
    ok: descOk,
    hint: descOk ? "Описание ок" : "Добавьте описание",
  });

  const charOk = input.characteristicCount >= 2;
  const charScore =
    input.characteristicCount >= 4
      ? WEIGHTS.characteristics
      : input.characteristicCount >= 2
        ? 14
        : input.characteristicCount === 1
          ? 8
          : 0;
  factors.push({
    key: "characteristics",
    label: "Характеристики",
    max: WEIGHTS.characteristics,
    score: charScore,
    ok: charOk,
    hint: charOk ? "Характеристики ок" : "Заполните характеристики",
  });

  const catOk = input.hasCategory || Boolean(input.hasProductType);
  factors.push({
    key: "category",
    label: "Категория",
    max: WEIGHTS.category,
    score: catOk ? WEIGHTS.category : 0,
    ok: catOk,
    hint: catOk ? "Категория указана" : "Выберите тип/категорию товара",
  });

  const priceOk = Number.isFinite(input.price) && input.price > 0;
  factors.push({
    key: "price",
    label: "Цена",
    max: WEIGHTS.price,
    score: priceOk ? WEIGHTS.price : 0,
    ok: priceOk,
    hint: priceOk ? "Цена указана" : "Укажите цену",
  });

  factors.push({
    key: "seller",
    label: "Продавец",
    max: WEIGHTS.seller,
    score: input.hasSeller ? WEIGHTS.seller : 0,
    ok: input.hasSeller,
    hint: input.hasSeller ? "Продавец привязан" : "Нет продавца",
  });

  const score = Math.max(
    0,
    Math.min(
      100,
      factors.reduce((sum, f) => sum + f.score, 0),
    ),
  );

  const improvements = factors
    .filter((f) => !f.ok || f.score < f.max * 0.75)
    .map((f) => f.hint)
    .filter((h) => !h.includes("ок") && !h.includes("порядке") && !h.includes("привязан"));

  return { score, factors, improvements };
}
