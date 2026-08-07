import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Package,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

import { formatPrice } from "@/features/products/mappers";
import type { SellerDashboardStats } from "@/features/seller/queries";
import { cn } from "@/lib/utils";

type KpiCard = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tabular?: boolean;
};

export function DashboardKpiCards({ stats }: { stats: SellerDashboardStats }) {
  const cards: KpiCard[] = [
    { label: "Всего товаров", value: stats.totalProducts, icon: Package },
    { label: "Активных", value: stats.activeProducts, icon: PackageCheck },
    { label: "Продано (шт.)", value: stats.salesCount, icon: TrendingUp },
    { label: "Заказов", value: stats.ordersCount, icon: ShoppingBag },
    {
      label: "Выручка",
      value: formatPrice(stats.revenue),
      icon: Banknote,
      tabular: false,
    },
  ];

  return (
    <section aria-label="Ключевые показатели">
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <li key={card.label}>
              <div
                tabIndex={0}
                className={cn(
                  "flex h-full flex-col gap-3 rounded-2xl bg-card p-3.5 shadow-card ring-1 ring-border",
                  "transition-all duration-[var(--duration-base)] ease-[var(--ease-out-premium)]",
                  "hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-primary/30",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {card.label}
                  </span>
                  <span
                    className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
                    aria-hidden
                  >
                    <Icon className="size-4" />
                  </span>
                </div>
                <p
                  className={cn(
                    "font-heading text-2xl font-semibold tracking-tight text-foreground",
                    card.tabular === false ? "" : "tabular-nums",
                  )}
                >
                  {card.value}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
