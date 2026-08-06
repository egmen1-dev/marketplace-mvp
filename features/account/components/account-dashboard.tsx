import Link from "next/link";
import {
  Clock,
  Heart,
  Package,
  Settings,
  UserRound,
} from "lucide-react";

import type { UserProfile } from "@/features/account/types";
import { ROUTES } from "@/lib/constants";

type AccountDashboardProps = {
  profile: UserProfile;
  favoritesCount: number;
  ordersCount: number;
};

const LINKS = [
  {
    href: ROUTES.PROFILE,
    title: "Мой профиль",
    description: "Имя, телефон, город и аватар",
    icon: UserRound,
  },
  {
    href: ROUTES.FAVORITES,
    title: "Избранное",
    description: "Сохранённые товары",
    icon: Heart,
  },
  {
    href: ROUTES.HISTORY,
    title: "История",
    description: "Недавно просмотренные",
    icon: Clock,
  },
  {
    href: ROUTES.ORDERS,
    title: "Мои заказы",
    description: "Статусы и доставка",
    icon: Package,
  },
  {
    href: ROUTES.SETTINGS,
    title: "Настройки",
    description: "Данные аккаунта",
    icon: Settings,
  },
] as const;

export function AccountDashboard({
  profile,
  favoritesCount,
  ordersCount,
}: AccountDashboardProps) {
  const name = profile.name?.trim() || profile.email;

  return (
    <div className="space-y-6">
      <div className="animate-fade-up rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-card sm:p-6">
        <p className="text-sm text-muted-foreground">С возвращением</p>
        <p className="mt-1 font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          {name}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-background/70 px-3 py-1.5 text-muted-foreground backdrop-blur-sm">
            Избранное:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {favoritesCount}
            </span>
          </span>
          <span className="rounded-lg bg-background/70 px-3 py-1.5 text-muted-foreground backdrop-blur-sm">
            Заказы:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {ordersCount}
            </span>
          </span>
          {profile.city ? (
            <span className="rounded-lg bg-background/70 px-3 py-1.5 text-muted-foreground backdrop-blur-sm">
              {profile.city}
            </span>
          ) : null}
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((item, i) => {
          const Icon = item.icon;
          return (
            <li
              key={item.href}
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
                <span>
                  <span className="block font-heading text-sm font-semibold">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
