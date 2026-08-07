"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Clock,
  Heart,
  LayoutGrid,
  Package,
  Settings,
  UserRound,
} from "lucide-react";

import { Label } from "@/components/ui/label";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: ROUTES.PROFILE, label: "Мой профиль", icon: UserRound },
  { href: ROUTES.FAVORITES, label: "Избранное", icon: Heart },
  { href: ROUTES.HISTORY, label: "История", icon: Clock },
  { href: ROUTES.ORDERS, label: "Мои заказы", icon: Package },
  { href: ROUTES.SETTINGS, label: "Настройки", icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.PROFILE) {
    return pathname === ROUTES.PROFILE || pathname.startsWith(`${ROUTES.PROFILE}/`);
  }
  if (href === ROUTES.ORDERS) {
    return pathname === ROUTES.ORDERS || pathname.startsWith(`${ROUTES.ORDERS}/`);
  }
  if (href === ROUTES.HISTORY) {
    return pathname === ROUTES.HISTORY || pathname === "/profile/history";
  }
  if (href === ROUTES.SETTINGS) {
    return pathname === ROUTES.SETTINGS || pathname === "/account/settings";
  }
  return pathname === href;
}

export function AccountMobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const active =
    NAV_ITEMS.find((item) => isActive(pathname, item.href)) ?? NAV_ITEMS[0];

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-3 shadow-card">
      <Label htmlFor="account-mobile-nav" className="sr-only">
        Раздел кабинета
      </Label>
      <div className="relative">
        <LayoutGrid
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <select
          id="account-mobile-nav"
          value={active.href}
          onChange={(e) => router.push(e.target.value)}
          className={cn(
            "h-11 w-full appearance-none rounded-xl border border-border bg-background pl-10 pr-3 text-sm font-medium",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {NAV_ITEMS.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
