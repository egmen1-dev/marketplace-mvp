export const HIT_VIEWS_THRESHOLD = 40;
export const HIT_FAVORITES_THRESHOLD = 8;

export function isHitProduct(views: number, favoritesCount: number): boolean {
  return views >= HIT_VIEWS_THRESHOLD || favoritesCount >= HIT_FAVORITES_THRESHOLD;
}

export function ratingQualityLabel(averageRating: number): string | null {
  if (averageRating >= 4.5) return "Отлично";
  if (averageRating >= 4.0) return "Хорошо";
  if (averageRating >= 3.0) return "Нормально";
  return null;
}

export function formatSavings(amount: number): string {
  return `Выгода ${amount.toLocaleString("ru-RU")} ₽`;
}
