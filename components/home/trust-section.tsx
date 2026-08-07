import { Package, ShieldCheck, Truck } from "lucide-react";

import { APP_NAME } from "@/lib/constants";

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Безопасная оплата",
    text: "Оплата картой через защищённый платёжный сервис — без передачи данных продавцу.",
  },
  {
    icon: Truck,
    title: "Доставка СДЭК",
    text: "Расчёт доставки до пункта выдачи или курьером при оформлении заказа.",
  },
  {
    icon: Package,
    title: "Единый каталог",
    text: "Товары от магазинов и частных продавцов — в одном месте.",
  },
] as const;

export function TrustSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 max-w-xl">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Почему выбирают {APP_NAME}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Надёжная покупка и удобная доставка без лишней сложности.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        {trustItems.map((item, index) => (
          <div
            key={item.title}
            className="animate-fade-up flex flex-col rounded-2xl border border-border bg-card/70 p-5 sm:p-6"
            style={{ animationDelay: `${80 + index * 70}ms` }}
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20 sm:size-14">
              <item.icon
                className="size-6 sm:size-7"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <h3 className="mt-5 font-heading text-base font-semibold tracking-tight sm:text-lg">
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
