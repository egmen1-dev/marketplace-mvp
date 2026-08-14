import { ROUTES } from "@/lib/constants";

import type { AccountMode, UxNavItem } from "./types";

export const BUYER_UX_NAV: UxNavItem[] = [
  { href: ROUTES.HOME, label: "Главная", icon: "home" },
  { href: ROUTES.CATALOG, label: "Каталог", icon: "catalog" },
  { href: ROUTES.DISCOVER, label: "Находки", icon: "discover" },
  { href: ROUTES.FAVORITES, label: "Избранное", icon: "heart" },
  { href: ROUTES.ORDERS, label: "Заказы", icon: "orders" },
  { href: ROUTES.ACCOUNT, label: "Профиль", icon: "profile" },
];

export const SELLER_UX_NAV: UxNavItem[] = [
  { href: ROUTES.ACCOUNT_BUSINESS, label: "Мой бизнес", icon: "store" },
  { href: ROUTES.ACCOUNT_PRODUCTS, label: "Товары", icon: "products" },
  { href: ROUTES.ACCOUNT_SALES, label: "Заказы", icon: "orders" },
  { href: ROUTES.ACCOUNT_PROMOTION_CENTER, label: "Продвижение", icon: "promo" },
  { href: ROUTES.ACCOUNT_COMMAND_CENTER, label: "Аналитика", icon: "analytics" },
  { href: ROUTES.ACCOUNT_BALANCE, label: "Деньги", icon: "money" },
  { href: ROUTES.SETTINGS, label: "Настройки", icon: "settings" },
];

export function uxNavForMode(mode: AccountMode): UxNavItem[] {
  return mode === "seller" ? SELLER_UX_NAV : BUYER_UX_NAV;
}
