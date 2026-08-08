import {
  Heart,
  Package,
  Settings,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROUTES } from "@/lib/constants";

export type AccountNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Seller-only item (hidden for pure buyers). */
  sellerOnly?: boolean;
  match: (pathname: string) => boolean;
};

export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  {
    href: ROUTES.ACCOUNT,
    label: "Главная",
    icon: UserRound,
    match: (path) => path === ROUTES.ACCOUNT,
  },
  {
    href: ROUTES.PROFILE,
    label: "Мой профиль",
    icon: UserRound,
    match: (path) =>
      path === ROUTES.PROFILE || path.startsWith(`${ROUTES.PROFILE}/`),
  },
  {
    href: ROUTES.ORDERS,
    label: "Покупки",
    icon: ShoppingBag,
    match: (path) =>
      path === ROUTES.ORDERS ||
      path.startsWith(`${ROUTES.ORDERS}/`) ||
      path === "/orders" ||
      path.startsWith("/orders/"),
  },
  {
    href: ROUTES.FAVORITES,
    label: "Избранное",
    icon: Heart,
    match: (path) => path === ROUTES.FAVORITES || path === "/favorites",
  },
  {
    href: ROUTES.ACCOUNT_PRODUCTS,
    label: "Мои товары",
    icon: Package,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_PRODUCTS ||
      path.startsWith(`${ROUTES.ACCOUNT_PRODUCTS}/`),
  },
  {
    href: ROUTES.ACCOUNT_SALES,
    label: "Мои продажи",
    icon: Store,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_SALES ||
      path.startsWith(`${ROUTES.ACCOUNT_SALES}/`),
  },
  {
    href: ROUTES.SETTINGS,
    label: "Настройки",
    icon: Settings,
    match: (path) =>
      path === ROUTES.SETTINGS ||
      path === "/settings" ||
      path === "/account/settings",
  },
];

export function accountNavItemsFor(isSeller: boolean): AccountNavItem[] {
  return ACCOUNT_NAV_ITEMS.filter((item) => !item.sellerOnly || isSeller);
}
