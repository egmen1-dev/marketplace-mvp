"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Package, ShoppingBag, Store } from "lucide-react";

import { BecomeSellerButton } from "@/features/account/components/become-seller-button";
import { accountNavItemsFor } from "@/features/account/components/account-nav-items";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AccountMobileNavProps = {
  isSeller: boolean;
};

type BottomItem = {
  href: string;
  label: string;
  icon: typeof ShoppingBag;
  sellerOnly?: boolean;
};

const BOTTOM_ITEMS: BottomItem[] = [
  { href: ROUTES.ORDERS, label: "Покупки", icon: ShoppingBag },
  { href: ROUTES.FAVORITES, label: "Избранное", icon: Heart },
  {
    href: ROUTES.ACCOUNT_PRODUCTS,
    label: "Товары",
    icon: Package,
    sellerOnly: true,
  },
  {
    href: ROUTES.ACCOUNT_SALES,
    label: "Продажи",
    icon: Store,
    sellerOnly: true,
  },
];

export function AccountMobileNav({ isSeller }: AccountMobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const items = accountNavItemsFor(isSeller);

  const active =
    items.find((item) => item.match(pathname)) ?? items[0] ?? {
      href: ROUTES.ACCOUNT,
      label: "Главная",
    };

  const bottomItems = BOTTOM_ITEMS.filter(
    (item) => !item.sellerOnly || isSeller,
  );

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card/50 p-3 shadow-card">
        <Label htmlFor="account-mobile-nav" className="sr-only">
          Раздел кабинета
        </Label>
        <select
          id="account-mobile-nav"
          value={active.href}
          onChange={(e) => router.push(e.target.value)}
          className={cn(
            "h-11 w-full appearance-none rounded-xl border border-border bg-background px-3 text-sm font-medium",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {items.map((item) => (
            <option key={`${item.href}-${item.label}`} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>
        {!isSeller ? (
          <div className="mt-3">
            <BecomeSellerButton
              className="w-full"
              label="Начать продавать"
              redirectTo={ROUTES.ACCOUNT_PRODUCTS_NEW}
            />
          </div>
        ) : null}
      </div>

      <nav
        aria-label="Быстрый переход"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around gap-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
          {!isSeller ? (
            <li className="min-w-0 flex-1">
              <Link
                href={`${ROUTES.ACCOUNT}?sell=1`}
                className="flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                <Store className="size-5" aria-hidden />
                <span className="truncate">Продать</span>
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>
    </div>
  );
}
