export function formatProductCount(count: number, hasMore: boolean): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = "товаров";
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) word = "товар";
    else if (mod10 >= 2 && mod10 <= 4) word = "товара";
  }
  if (hasMore) return `Показано ${count.toLocaleString("ru-RU")}+ ${word}`;
  return `Найдено ${count.toLocaleString("ru-RU")} ${word}`;
}

export function formatReviewsCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} отзывов`;
  if (mod10 === 1) return `${count} отзыв`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} отзыва`;
  return `${count} отзывов`;
}
