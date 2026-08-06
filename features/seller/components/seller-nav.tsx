"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

const NAV_ITEMS = [
  {
    href: ROUTES.SELLER_DASHBOARD,
    label: "Главная",
    icon: LayoutDashboard,
    match: (pathname: string) =>
      pathname === ROUTES.SELLER_DASHBOARD || pathname === ROUTES.SELLER,
  },
  {
    href: ROUTES.SELLER_PRODUCTS,
    label: "Товары",
    icon: Package,
    match: (pathname: string) =>
      pathname === ROUTES.SELLER_PRODUCTS ||
      (pathname.startsWith(`${ROUTES.SELLER_PRODUCTS}/`) &&
        !pathname.startsWith(ROUTES.SELLER_NEW_PRODUCT)),
  },
  {
    href: ROUTES.SELLER_ORDERS,
    label: "Заказы",
    icon: ShoppingBag,
    match: (pathname: string) => pathname.startsWith(ROUTES.SELLER_ORDERS),
  },
  {
    href: ROUTES.SELLER_ANALYTICS,
    label: "Аналитика",
    icon: BarChart3,
    match: (pathname: string) => pathname.startsWith(ROUTES.SELLER_ANALYTICS),
  },
  {
    href: ROUTES.SELLER_SETTINGS,
    label: "Настройки",
    icon: Settings,
    match: (pathname: string) => pathname.startsWith(ROUTES.SELLER_SETTINGS),
  },
] as const;

export function SellerNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Кабинет продавца"
      className="flex flex-col gap-1 sm:sticky sm:top-20"
    >
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Кабинет
      </p>
      <div className="flex flex-row gap-1 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
