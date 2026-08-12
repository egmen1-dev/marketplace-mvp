import {
  BadgeCheck,
  Shield,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { TrustBlockViewTracker } from "@/components/trust/trust-block-view-tracker";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Безопасная оплата",
    text: "Картой через защищённый сервис",
  },
  {
    icon: BadgeCheck,
    title: "Проверенные продавцы",
    text: "Модерация и статус на карточке",
  },
  {
    icon: Truck,
    title: "Доставка",
    text: "СДЭК — ПВЗ или курьер",
  },
  {
    icon: Shield,
    title: "Защита покупателя",
    text: "Правила возврата на площадке",
  },
] as const;

type TrustStripProps = {
  className?: string;
  blockId?: "homepage" | "catalog";
  route?: string;
};

/** Compact trust row — visible on first mobile screen after hero. */
export function TrustStrip({
  className,
  blockId = "homepage",
  route = "/",
}: TrustStripProps) {
  return (
    <div
      className={cn(
        "border-t border-border/80 bg-surface/40 backdrop-blur-sm",
        className,
      )}
      data-testid="trust-strip"
    >
      <TrustBlockViewTracker blockId={blockId} route={route} />
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-4 sm:gap-3 sm:px-6 sm:py-4">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/80 px-2.5 py-2 sm:px-3 sm:py-2.5"
          >
            <item.icon
              className="mt-0.5 size-4 shrink-0 text-primary sm:size-[18px]"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-[11px] font-medium leading-tight text-foreground sm:text-xs">
                {item.title}
              </p>
              <p className="mt-0.5 hidden text-[10px] leading-snug text-muted-foreground min-[360px]:block sm:text-[11px]">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
