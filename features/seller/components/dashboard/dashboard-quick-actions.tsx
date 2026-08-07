import Link from "next/link";
import {
  Package,
  Plus,
  Settings,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ACTIONS: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: ROUTES.SELLER_NEW_PRODUCT,
    label: "Добавить товар",
    description: "Новое объявление",
    icon: Plus,
  },
  {
    href: ROUTES.SELLER_PRODUCTS,
    label: "Мои товары",
    description: "Каталог магазина",
    icon: Package,
  },
  {
    href: ROUTES.SELLER_ORDERS,
    label: "Заказы",
    description: "Обработка продаж",
    icon: ShoppingBag,
  },
  {
    href: ROUTES.SELLER_SETTINGS,
    label: "Настройки",
    description: "Профиль магазина",
    icon: Settings,
  },
];

export function DashboardQuickActions() {
  return (
    <section
      aria-labelledby="seller-quick-actions-heading"
      className="flex flex-col gap-2.5"
    >
      <h2
        id="seller-quick-actions-heading"
        className="font-heading text-base font-semibold tracking-tight"
      >
        Быстрые действия
      </h2>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.href}>
              <Link
                href={action.href}
                className={cn(
                  "group flex h-full items-start gap-3 rounded-2xl bg-card p-3.5 shadow-card ring-1 ring-border",
                  "transition-all duration-[var(--duration-base)] ease-[var(--ease-out-premium)]",
                  "hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-primary/35",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                  aria-hidden
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {action.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {action.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
