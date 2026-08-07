import { Activity, Package, ShoppingBag } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SellerActivityItem } from "@/features/seller/queries";

import { DashboardEmptyState } from "./dashboard-empty-state";

function formatActivityDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(iso));
}

function ActivityIcon({ type }: { type: SellerActivityItem["type"] }) {
  if (type === "product_created" || type === "price_changed") {
    return <Package className="size-3.5" aria-hidden />;
  }
  return <ShoppingBag className="size-3.5" aria-hidden />;
}

export function DashboardActivity({
  items,
}: {
  items: SellerActivityItem[];
}) {
  return (
    <Card className="hover:translate-y-0">
      <CardHeader className="border-b border-border/70 pb-3">
        <CardTitle>Последняя активность</CardTitle>
        <CardDescription>
          Реальные события по товарам и заказам
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1">
        {items.length === 0 ? (
          <DashboardEmptyState
            className="py-6"
            icon={<Activity className="size-5" />}
            title="Активность появится после действий"
            description="Создание товаров и смена статусов заказов отобразятся здесь"
          />
        ) : (
          <ul className="divide-y divide-border" aria-label="Лента активности">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 py-3 first:pt-2 last:pb-0"
              >
                <span
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                  aria-hidden
                >
                  <ActivityIcon type={item.type} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    <time dateTime={item.createdAt}>
                      {formatActivityDate(item.createdAt)}
                    </time>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
