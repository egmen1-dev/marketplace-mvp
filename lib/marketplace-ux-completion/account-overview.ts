import { ROUTES } from "@/lib/constants";
import { isLotWalletEnabled } from "@/lib/lot-wallet/flags";

import { getAccountMode } from "./actions";
import { isMarketplaceUxCompletionEnabled } from "./flags";
import type { AccountOverview, AccountMode, AccountOverviewSection } from "./types";

export async function buildAccountOverview(input: {
  profile: {
    name: string | null;
    email: string;
    phone: string | null;
    city: string | null;
    avatarUrl: string | null;
  };
  isSeller: boolean;
  favoritesCount: number;
  ordersCount: number;
  productsCount: number | null;
  revenue: number | null;
}): Promise<AccountOverview> {
  if (!isMarketplaceUxCompletionEnabled()) {
    return {
      enabled: false,
      mode: "buyer",
      isSeller: input.isSeller,
      profile: {
        name: input.profile.name?.trim() || input.profile.email,
        email: input.profile.email,
        phone: input.profile.phone,
        city: input.profile.city,
        avatarUrl: input.profile.avatarUrl,
      },
      sections: [],
    };
  }

  const mode: AccountMode = input.isSeller ? await getAccountMode() : "buyer";

  const walletHref = isLotWalletEnabled()
    ? ROUTES.ACCOUNT_WALLET
    : ROUTES.ACCOUNT_BALANCE;

  const buyerSection = {
    id: "buyer",
    title: "🛒 Покупки",
    items: [
      { label: "Заказы", value: String(input.ordersCount), href: ROUTES.ORDERS },
      { label: "Избранное", value: String(input.favoritesCount), href: ROUTES.FAVORITES },
      { label: "История", value: "Открыть", href: ROUTES.HISTORY },
    ],
  };

  const walletSection = {
    id: "wallet",
    title: "💳 Кошелёк ЛОТ",
    items: [
      {
        label: "Доступно",
        value: input.revenue != null ? `${Math.round(input.revenue)} ₽` : "Открыть",
        href: walletHref,
      },
      { label: "Управление", value: "Открыть кошелёк", href: walletHref },
    ],
  };

  const sellerSection = input.isSeller
    ? {
        id: "seller",
        title: "🏪 Мой бизнес",
        items: [
          {
            label: "Статус продавца",
            value: "Активен",
            href: ROUTES.ACCOUNT_BUSINESS,
          },
          {
            label: "Товары",
            value: String(input.productsCount ?? 0),
            href: ROUTES.ACCOUNT_PRODUCTS,
          },
          {
            label: "Заказы",
            value: String(input.ordersCount),
            href: ROUTES.ACCOUNT_SALES,
          },
          {
            label: "Продвижение",
            value: "Управлять",
            href: ROUTES.ACCOUNT_PROMOTION_CENTER,
          },
        ],
      }
    : null;

  const settingsSection = {
    id: "settings",
    title: "⚙️ Настройки",
    items: [
      { label: "Профиль и безопасность", value: "Открыть", href: ROUTES.SETTINGS },
    ],
  };

  const sections: AccountOverviewSection[] = [buyerSection, walletSection];
  if (sellerSection && mode === "seller") sections.push(sellerSection);
  if (mode === "buyer" && sellerSection) sections.push(sellerSection);
  sections.push(settingsSection);

  return {
    enabled: true,
    mode,
    isSeller: input.isSeller,
    profile: {
      name: input.profile.name?.trim() || input.profile.email,
      email: input.profile.email,
      phone: input.profile.phone,
      city: input.profile.city,
      avatarUrl: input.profile.avatarUrl,
    },
    sections,
  };
}
