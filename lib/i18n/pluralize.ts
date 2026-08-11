/**
 * Russian pluralization helpers for marketplace UI copy.
 */

function russianPluralForm(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Word only: товар / товара / товаров */
export function pluralizeProductWord(count: number): string {
  return russianPluralForm(count, "товар", "товара", "товаров");
}

/** Full label: «1 товар», «3 товара», «5 товаров» */
export function pluralizeProductCount(count: number): string {
  return `${count} ${pluralizeProductWord(count)}`;
}

/** Word only: продавец / продавца / продавцов */
export function pluralizeSellerWord(count: number): string {
  return russianPluralForm(count, "продавец", "продавца", "продавцов");
}

export function pluralizeSellerCount(count: number): string {
  return `${count} ${pluralizeSellerWord(count)}`;
}

/** Word only: отзыв / отзыва / отзывов */
export function pluralizeReviewWord(count: number): string {
  return russianPluralForm(count, "отзыв", "отзыва", "отзывов");
}

/** Word only: оценка / оценки / оценок */
export function pluralizeRatingWord(count: number): string {
  return russianPluralForm(count, "оценка", "оценки", "оценок");
}

/** Word only: категория / категории / категорий */
export function pluralizeCategoryWord(count: number): string {
  return russianPluralForm(count, "категория", "категории", "категорий");
}

export function pluralizeCategoryCount(count: number): string {
  return `${count} ${pluralizeCategoryWord(count)}`;
}
