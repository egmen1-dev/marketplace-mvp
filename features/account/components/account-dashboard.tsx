import Link from "next/link";
import {
  Heart,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Wallet,
} from "lucide-react";

import { BecomeSellerButton } from "@/features/account/components/become-seller-button";
import type { UserProfile } from "@/features/account/types";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";

type AccountDashboardProps = {
  profile: UserProfile;
  favoritesCount: number;
  ordersCount: number;
  productsCount: number | null;
  revenue: number | null;
  isSeller: boolean;
  promptSell?: boolean;
};

type OverviewCard = {
  href: string;
  title: string;
  value: string;
  hint: string;
  icon: typeof ShoppingBag;
};

export function AccountDashboard({
  profile,
  favoritesCount,
  ordersCount,
  productsCount,
  revenue,
  isSeller,
  promptSell = false,
}: AccountDashboardProps) {
  const name = profile.name?.trim() || profile.email;

  const cards: OverviewCard[] = [
    {
      href: ROUTES.ORDERS,
      title: "Покупки",
      value: String(ordersCount),
      hint: "заказов",
      icon: ShoppingBag,
    },
    {
      href: ROUTES.FAVORITES,
      title: "Избранное",
      value: String(favoritesCount),
      hint: "товаров",
      icon: Heart,
    },
  ];

  if (isSeller && productsCount != null) {
    cards.push({
      href: ROUTES.ACCOUNT_PRODUCTS,
      title: "Продажи",
      value: String(productsCount),
      hint: "товаров",
      icon: Package,
    });
  }

  if (isSeller && revenue != null) {
    cards.push({
      href: ROUTES.ACCOUNT_SALES,
      title: "Выручка",
      value: formatPrice(revenue),
      hint: "по оплаченным заказам",
      icon: Wallet,
    });
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-up rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-card sm:p-6">
        <p className="text-sm text-muted-foreground">С возвращением</p>
        <p className="mt-1 font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          {name}
        </p>
        {profile.city ? (
          <p className="mt-2 text-sm text-muted-foreground">{profile.city}</p>
        ) : null}
      </div>

      {!isSeller || promptSell ? (
        <div className="animate-fade-up flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Store className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">
                {isSeller ? "Добавить объявление" : "Начать продавать"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isSeller
                  ? "Создайте новый товар — он появится в каталоге."
                  : "Один аккаунт для покупок и продаж. Профиль продавца создаётся сразу."}
              </p>
            </div>
          </div>
          {isSeller ? (
            <Link
              href={ROUTES.ACCOUNT_PRODUCTS_NEW}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Продать товар
            </Link>
          ) : (
            <BecomeSellerButton
              label="Продать товар"
              redirectTo={ROUTES.ACCOUNT_PRODUCTS_NEW}
            />
          )}
        </div>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map((item, i) => {
          const Icon = item.icon;
          return (
            <li
              key={item.title}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Link
                href={item.href}
                className="group flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4 transition-[border-color,background-color,transform] duration-[var(--duration-base)] ease-[var(--ease-out-premium)] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block font-heading text-xl font-semibold tabular-nums tracking-tight">
                    {item.value}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.hint}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        <li className="animate-fade-up" style={{ animationDelay: "160ms" }}>
          <Link
            href={ROUTES.SETTINGS}
            className="group flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4 transition-[border-color,background-color,transform] duration-[var(--duration-base)] ease-[var(--ease-out-premium)] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Settings className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-heading text-sm font-semibold">
                Настройки
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Данные аккаунта
              </span>
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
