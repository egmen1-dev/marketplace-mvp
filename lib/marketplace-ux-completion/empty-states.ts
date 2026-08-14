import { ROUTES } from "@/lib/constants";

import type { UxEmptyState } from "./types";

export function getFavoritesEmptyState(): UxEmptyState {
  return {
    id: "favorites",
    emoji: "❤️",
    title: "Здесь будут ваши находки",
    body: "Сохраняйте товары, которые понравились.",
    bullets: [
      "✓ похожие товары",
      "✓ изменение цены",
      "✓ новые предложения",
    ],
    ctaLabel: "Найти товары",
    ctaHref: ROUTES.CATALOG,
  };
}

export function getOrdersEmptyState(): UxEmptyState {
  return {
    id: "orders",
    emoji: "🛒",
    title: "Пока нет покупок",
    body: "Начните с наших находок.",
    bullets: [],
    ctaLabel: "Перейти в каталог",
    ctaHref: ROUTES.CATALOG,
  };
}

export function getSellerProductsEmptyState(): UxEmptyState {
  return {
    id: "seller-products",
    emoji: "🏪",
    title: "Ваш магазин пока пуст",
    body: "Создайте первый товар и начните продавать.",
    bullets: [],
    ctaLabel: "Добавить товар",
    ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
  };
}

export function getEmptyStateById(id: string): UxEmptyState | null {
  switch (id) {
    case "favorites":
      return getFavoritesEmptyState();
    case "orders":
      return getOrdersEmptyState();
    case "seller-products":
      return getSellerProductsEmptyState();
    default:
      return null;
  }
}
