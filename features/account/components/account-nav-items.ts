import {
  BarChart3,
  Heart,
  MapPin,
  MessageCircle,
  Megaphone,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROUTES } from "@/lib/constants";
import { isLotWalletEnabled } from "@/lib/lot-wallet/flags";
import { isMarketplaceUxCompletionEnabled } from "@/lib/marketplace-ux-completion/flags";
import { isSellerJourneyEnabled } from "@/lib/seller-journey/flags";
import { isSellerOperatingDeskEnabled } from "@/lib/seller-operating-desk/flags";
import { isSellerLifecycleEnabled } from "@/lib/seller-lifecycle/flags";

export type AccountNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Seller-only item (hidden for pure buyers). */
  sellerOnly?: boolean;
  match: (pathname: string) => boolean;
};

const BUYER_NAV: AccountNavItem[] = [
  {
    href: ROUTES.ACCOUNT,
    label: "Главная",
    icon: UserRound,
    match: (path) => path === ROUTES.ACCOUNT,
  },
  ...(isMarketplaceUxCompletionEnabled()
    ? [
        {
          href: `${ROUTES.HOME}#discovery-home`,
          label: "Находки",
          icon: Sparkles,
          match: (path: string) => path === ROUTES.HOME,
        } as AccountNavItem,
      ]
    : []),
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
    href: ROUTES.ACCOUNT_MESSAGES,
    label: "Сообщения",
    icon: MessageCircle,
    match: (path) =>
      path === ROUTES.ACCOUNT_MESSAGES ||
      path.startsWith(`${ROUTES.ACCOUNT_MESSAGES}/`),
  },
  {
    href: ROUTES.ACCOUNT_RESERVATIONS,
    label: "Бронирования",
    icon: Ticket,
    match: (path) =>
      path === ROUTES.ACCOUNT_RESERVATIONS ||
      path.startsWith(`${ROUTES.ACCOUNT_RESERVATIONS}/`),
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

/** Seller business workspace nav when SELLER_OPERATING_DESK_ENABLED. */
const SELLER_OPERATING_DESK_NAV: AccountNavItem[] = [
  {
    href: ROUTES.ACCOUNT_BUSINESS,
    label: "Мой бизнес",
    icon: Store,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_BUSINESS ||
      path.startsWith(`${ROUTES.ACCOUNT_BUSINESS}/`),
  },
  {
    href: ROUTES.ACCOUNT_PRODUCTS,
    label: "Товары",
    icon: Package,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_PRODUCTS ||
      path.startsWith(`${ROUTES.ACCOUNT_PRODUCTS}/`),
  },
  {
    href: ROUTES.ACCOUNT_SALES,
    label: "Заказы",
    icon: ShoppingBag,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_SALES ||
      path.startsWith(`${ROUTES.ACCOUNT_SALES}/`),
  },
  {
    href: ROUTES.ACCOUNT_PROMOTION_CENTER,
    label: "Продвижение",
    icon: Megaphone,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_PROMOTION_CENTER ||
      path.startsWith(`${ROUTES.ACCOUNT_PROMOTION_CENTER}/`),
  },
  {
    href: ROUTES.ACCOUNT_COMMAND_CENTER,
    label: "Аналитика",
    icon: BarChart3,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_COMMAND_CENTER ||
      path.startsWith(`${ROUTES.ACCOUNT_COMMAND_CENTER}/`),
  },
  {
    href: ROUTES.ACCOUNT_GROWTH,
    label: "AI помощник",
    icon: Sparkles,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_GROWTH ||
      path.startsWith(`${ROUTES.ACCOUNT_GROWTH}/`),
  },
  {
    href: ROUTES.ACCOUNT_BALANCE,
    label: "Деньги",
    icon: Wallet,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_BALANCE ||
      path.startsWith(`${ROUTES.ACCOUNT_BALANCE}/`) ||
      path === ROUTES.ACCOUNT_PAYOUTS ||
      path.startsWith(`${ROUTES.ACCOUNT_PAYOUTS}/`),
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

/** Unified seller nav when SELLER_JOURNEY_ENABLED — AI-guided cabinet. */
const SELLER_JOURNEY_NAV: AccountNavItem[] = [
  {
    href: ROUTES.ACCOUNT,
    label: "Мой магазин",
    icon: Store,
    sellerOnly: true,
    match: (path) => path === ROUTES.ACCOUNT,
  },
  {
    href: ROUTES.ACCOUNT_PRODUCTS,
    label: "Товары",
    icon: Package,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_PRODUCTS ||
      path.startsWith(`${ROUTES.ACCOUNT_PRODUCTS}/`),
  },
  {
    href: ROUTES.ACCOUNT_SALES,
    label: "Заказы",
    icon: ShoppingBag,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_SALES ||
      path.startsWith(`${ROUTES.ACCOUNT_SALES}/`),
  },
  {
    href: ROUTES.ACCOUNT_PROMOTION_CENTER,
    label: "Продвижение",
    icon: Megaphone,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_PROMOTION_CENTER ||
      path.startsWith(`${ROUTES.ACCOUNT_PROMOTION_CENTER}/`),
  },
  {
    href: ROUTES.ACCOUNT_COMMAND_CENTER,
    label: "Аналитика",
    icon: BarChart3,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_COMMAND_CENTER ||
      path.startsWith(`${ROUTES.ACCOUNT_COMMAND_CENTER}/`),
  },
  {
    href: ROUTES.ACCOUNT_GROWTH,
    label: "AI помощник",
    icon: Sparkles,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_GROWTH ||
      path.startsWith(`${ROUTES.ACCOUNT_GROWTH}/`) ||
      path === ROUTES.ACCOUNT_SELLER_START,
  },
  {
    href: ROUTES.ACCOUNT_BALANCE,
    label: "Деньги",
    icon: Wallet,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_BALANCE ||
      path.startsWith(`${ROUTES.ACCOUNT_BALANCE}/`) ||
      path === ROUTES.ACCOUNT_PAYOUTS ||
      path.startsWith(`${ROUTES.ACCOUNT_PAYOUTS}/`),
  },
  {
    href: ROUTES.ACCOUNT_MESSAGES,
    label: "Сообщения",
    icon: MessageCircle,
    match: (path) =>
      path === ROUTES.ACCOUNT_MESSAGES ||
      path.startsWith(`${ROUTES.ACCOUNT_MESSAGES}/`),
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

/** Simplified seller nav when SELLER_LIFECYCLE_ENABLED — «Мой магазин» structure. */
const SELLER_LIFECYCLE_NAV: AccountNavItem[] = [
  {
    href: ROUTES.ACCOUNT,
    label: "Мой магазин",
    icon: Store,
    sellerOnly: true,
    match: (path) => path === ROUTES.ACCOUNT,
  },
  {
    href: ROUTES.ACCOUNT_PRODUCTS,
    label: "Товары",
    icon: Package,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_PRODUCTS ||
      path.startsWith(`${ROUTES.ACCOUNT_PRODUCTS}/`),
  },
  {
    href: ROUTES.ACCOUNT_SALES,
    label: "Заказы",
    icon: ShoppingBag,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_SALES ||
      path.startsWith(`${ROUTES.ACCOUNT_SALES}/`),
  },
  {
    href: ROUTES.ACCOUNT_PROMOTION_CENTER,
    label: "Продвижение",
    icon: Megaphone,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_PROMOTION_CENTER ||
      path.startsWith(`${ROUTES.ACCOUNT_PROMOTION_CENTER}/`) ||
      path === "/account/promotions",
  },
  {
    href: ROUTES.ACCOUNT_COMMAND_CENTER,
    label: "Аналитика",
    icon: BarChart3,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_COMMAND_CENTER ||
      path.startsWith(`${ROUTES.ACCOUNT_COMMAND_CENTER}/`),
  },
  {
    href: ROUTES.ACCOUNT_BALANCE,
    label: "Деньги",
    icon: Wallet,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_BALANCE ||
      path.startsWith(`${ROUTES.ACCOUNT_BALANCE}/`) ||
      path === ROUTES.ACCOUNT_PAYOUTS ||
      path.startsWith(`${ROUTES.ACCOUNT_PAYOUTS}/`),
  },
  {
    href: ROUTES.ACCOUNT_COMMAND_CENTER,
    label: "AI помощник",
    icon: Sparkles,
    sellerOnly: true,
    match: (path) => path === ROUTES.ACCOUNT_COMMAND_CENTER,
  },
  {
    href: ROUTES.ACCOUNT_MESSAGES,
    label: "Сообщения",
    icon: MessageCircle,
    match: (path) =>
      path === ROUTES.ACCOUNT_MESSAGES ||
      path.startsWith(`${ROUTES.ACCOUNT_MESSAGES}/`),
  },
  {
    href: ROUTES.ACCOUNT_PICKUP_POINTS,
    label: "Точки самовывоза",
    icon: MapPin,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_PICKUP_POINTS ||
      path.startsWith(`${ROUTES.ACCOUNT_PICKUP_POINTS}/`),
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

const LEGACY_SELLER_NAV: AccountNavItem[] = [
  ...BUYER_NAV.slice(0, 5),
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
    label: "Продажи",
    icon: Store,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_SALES ||
      path.startsWith(`${ROUTES.ACCOUNT_SALES}/`),
  },
  {
    href: ROUTES.ACCOUNT_BALANCE,
    label: "Баланс",
    icon: Wallet,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_BALANCE ||
      path.startsWith(`${ROUTES.ACCOUNT_BALANCE}/`),
  },
  {
    href: ROUTES.ACCOUNT_PAYOUTS,
    label: "Вывод",
    icon: Wallet,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_PAYOUTS ||
      path.startsWith(`${ROUTES.ACCOUNT_PAYOUTS}/`),
  },
  ...BUYER_NAV.slice(5),
];

/** Target seller nav — wallet unification epic. */
const UNIFIED_SELLER_NAV: AccountNavItem[] = [
  {
    href: ROUTES.ACCOUNT,
    label: "Мой аккаунт",
    icon: UserRound,
    match: (path) => path === ROUTES.ACCOUNT,
  },
  {
    href: ROUTES.ACCOUNT_BUSINESS,
    label: "Мой бизнес",
    icon: Store,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_BUSINESS ||
      path.startsWith(`${ROUTES.ACCOUNT_BUSINESS}/`),
  },
  {
    href: ROUTES.ACCOUNT_PRODUCTS,
    label: "Товары",
    icon: Package,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_PRODUCTS ||
      path.startsWith(`${ROUTES.ACCOUNT_PRODUCTS}/`),
  },
  {
    href: ROUTES.ACCOUNT_SALES,
    label: "Заказы",
    icon: ShoppingBag,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_SALES ||
      path.startsWith(`${ROUTES.ACCOUNT_SALES}/`),
  },
  {
    href: ROUTES.ACCOUNT_PROMOTION_CENTER,
    label: "Продвижение",
    icon: Megaphone,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_PROMOTION_CENTER ||
      path.startsWith(`${ROUTES.ACCOUNT_PROMOTION_CENTER}/`) ||
      path === ROUTES.ACCOUNT_PROMOTIONS,
  },
  {
    href: ROUTES.ACCOUNT_COMMAND_CENTER,
    label: "Аналитика",
    icon: BarChart3,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_COMMAND_CENTER ||
      path.startsWith(`${ROUTES.ACCOUNT_COMMAND_CENTER}/`),
  },
  {
    href: ROUTES.ACCOUNT_WALLET,
    label: "Кошелёк",
    icon: Wallet,
    match: (path) =>
      path === ROUTES.ACCOUNT_WALLET ||
      path.startsWith(`${ROUTES.ACCOUNT_WALLET}/`) ||
      path === ROUTES.ACCOUNT_BALANCE ||
      path === ROUTES.ACCOUNT_PAYOUTS,
  },
  {
    href: ROUTES.ACCOUNT_REPUTATION,
    label: "Репутация",
    icon: Sparkles,
    sellerOnly: true,
    match: (path) =>
      path === ROUTES.ACCOUNT_REPUTATION ||
      path.startsWith(`${ROUTES.ACCOUNT_REPUTATION}/`),
  },
  {
    href: ROUTES.SETTINGS,
    label: "Настройки",
    icon: Settings,
    match: (path) =>
      path === ROUTES.SETTINGS ||
      path === ROUTES.PROFILE ||
      path === "/settings",
  },
];

const BUYER_NAV_UNIFIED: AccountNavItem[] = [
  {
    href: ROUTES.ACCOUNT,
    label: "Мой аккаунт",
    icon: UserRound,
    match: (path) => path === ROUTES.ACCOUNT,
  },
  {
    href: ROUTES.ORDERS,
    label: "Покупки",
    icon: ShoppingBag,
    match: (path) =>
      path === ROUTES.ORDERS || path.startsWith(`${ROUTES.ORDERS}/`),
  },
  {
    href: ROUTES.FAVORITES,
    label: "Избранное",
    icon: Heart,
    match: (path) => path === ROUTES.FAVORITES,
  },
  {
    href: ROUTES.ACCOUNT_WALLET,
    label: "Кошелёк",
    icon: Wallet,
    match: (path) =>
      path === ROUTES.ACCOUNT_WALLET ||
      path === ROUTES.ACCOUNT_BALANCE ||
      path === ROUTES.ACCOUNT_PAYOUTS,
  },
  {
    href: ROUTES.SETTINGS,
    label: "Настройки",
    icon: Settings,
    match: (path) =>
      path === ROUTES.SETTINGS ||
      path === ROUTES.PROFILE ||
      path === "/settings",
  },
];

/** Unified account nav — discoverable naming for chat. */
export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = LEGACY_SELLER_NAV;

export function accountNavItemsFor(isSeller: boolean): AccountNavItem[] {
  if (isLotWalletEnabled()) {
    const items = isSeller ? UNIFIED_SELLER_NAV : BUYER_NAV_UNIFIED;
    return items.filter((item) => !item.sellerOnly || isSeller);
  }

  const items =
    isSellerOperatingDeskEnabled() && isSeller
      ? SELLER_OPERATING_DESK_NAV
      : isSellerJourneyEnabled() && isSeller
        ? SELLER_JOURNEY_NAV
        : isSellerLifecycleEnabled() && isSeller
          ? SELLER_LIFECYCLE_NAV
          : ACCOUNT_NAV_ITEMS;
  return items.filter((item) => !item.sellerOnly || isSeller);
}
