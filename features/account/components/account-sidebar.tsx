"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  Heart,
  Package,
  Settings,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

const NAV_ITEMS = [
  {
    href: ROUTES.PROFILE,
    label: "Мой профиль",
    icon: UserRound,
    match: (path: string) =>
      path === ROUTES.PROFILE ||
      path.startsWith(`${ROUTES.PROFILE}/`) ||
      path === ROUTES.ACCOUNT,
  },
  {
    href: ROUTES.FAVORITES,
    label: "Избранное",
    icon: Heart,
    match: (path: string) => path === ROUTES.FAVORITES,
  },
  {
    href: ROUTES.HISTORY,
    label: "История",
    icon: Clock,
    match: (path: string) =>
      path === ROUTES.HISTORY || path === "/profile/history",
  },
  {
    href: ROUTES.ORDERS,
    label: "Мои заказы",
    icon: Package,
    match: (path: string) =>
      path === ROUTES.ORDERS || path.startsWith(`${ROUTES.ORDERS}/`),
  },
  {
    href: ROUTES.SETTINGS,
    label: "Настройки",
    icon: Settings,
    match: (path: string) =>
      path === ROUTES.SETTINGS || path === "/account/settings",
  },
] as const;

export function AccountSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Личный кабинет"
      className="flex flex-col gap-1"
    >
      <p className="mb-2 px-3 font-heading text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Кабинет
      </p>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-[color,background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-premium)]",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
