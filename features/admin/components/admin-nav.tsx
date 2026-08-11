"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FolderTree,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store,
  Ticket,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

const NAV_ITEMS = [
  {
    href: ROUTES.ADMIN,
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === ROUTES.ADMIN,
  },
  {
    href: ROUTES.ADMIN_USERS,
    label: "Пользователи",
    icon: Users,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_USERS),
  },
  {
    href: ROUTES.ADMIN_SELLERS,
    label: "Продавцы",
    icon: Store,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_SELLERS),
  },
  {
    href: ROUTES.ADMIN_PRODUCTS,
    label: "Товары",
    icon: Package,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_PRODUCTS),
  },
  {
    href: ROUTES.ADMIN_ORDERS,
    label: "Заказы",
    icon: ShoppingBag,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_ORDERS),
  },
  {
    href: ROUTES.ADMIN_RESERVATIONS,
    label: "Брони",
    icon: Ticket,
    match: (pathname: string) =>
      pathname.startsWith(ROUTES.ADMIN_RESERVATIONS),
  },
  {
    href: ROUTES.ADMIN_CATEGORIES,
    label: "Категории",
    icon: FolderTree,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_CATEGORIES),
  },
  {
    href: ROUTES.ADMIN_RANKING,
    label: "Ранжирование",
    icon: BarChart3,
    match: (pathname: string) => pathname.startsWith(ROUTES.ADMIN_RANKING),
  },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Админ-панель"
      className="flex flex-col gap-1 sm:sticky sm:top-20"
    >
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Админ
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
