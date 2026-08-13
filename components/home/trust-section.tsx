import { BadgeCheck, Shield, ShieldCheck, Truck } from "lucide-react";

import { APP_NAME } from "@/lib/constants";

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Безопасная оплата",
    text: "Оплата картой через защищённый платёжный сервис.",
  },
  {
    icon: BadgeCheck,
    title: "Проверенные продавцы",
    text: "Модерация и статус продавца на карточке товара.",
  },
  {
    icon: Truck,
    title: "Доставка СДЭК",
    text: "ПВЗ или курьер — расчёт при оформлении заказа.",
  },
  {
    icon: Shield,
    title: "Защита покупателя",
    text: "Правила возврата и поддержка на площадке.",
  },
] as const;

export function TrustSection() {
  return (
    <section className="border-t border-border bg-surface/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 max-w-xl">
          <h2 className="home-section-title font-heading font-semibold tracking-tight">
            Покупайте с уверенностью
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {APP_NAME} — маркетплейс с прозрачными правилами и доставкой.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {trustItems.map((item, index) => (
            <div
              key={item.title}
              className="animate-fade-up flex flex-col rounded-2xl border border-border bg-card/80 p-5 ring-1 ring-border/70"
              style={{ animationDelay: `${60 + index * 50}ms` }}
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <item.icon className="size-5" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="mt-4 font-heading text-base font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
