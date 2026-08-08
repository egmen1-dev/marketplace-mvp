"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BecomeSellerButton } from "@/features/account/components/become-seller-button";
import { accountNavItemsFor } from "@/features/account/components/account-nav-items";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AccountSidebarProps = {
  isSeller: boolean;
};

export function AccountSidebar({ isSeller }: AccountSidebarProps) {
  const pathname = usePathname();
  const items = accountNavItemsFor(isSeller);

  return (
    <nav aria-label="Личный кабинет" className="flex flex-col gap-1">
      <p className="mb-2 px-3 font-heading text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Кабинет
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={`${item.href}-${item.label}`}>
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

      {!isSeller ? (
        <div className="mt-4 border-t border-border pt-4">
          <BecomeSellerButton
            className="w-full justify-start gap-2.5 rounded-xl px-3 py-2.5 text-sm"
            label="Начать продавать"
            redirectTo={ROUTES.ACCOUNT_PRODUCTS_NEW}
          />
        </div>
      ) : null}
    </nav>
  );
}
