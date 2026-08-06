import { Package, ShieldCheck, Truck } from "lucide-react";

import { APP_NAME } from "@/lib/constants";

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Безопасная покупка",
    text: "Оплата картой с защитой сделки — деньги у продавца после подтверждения.",
  },
  {
    icon: Truck,
    title: "Быстрая доставка",
    text: "Отправка через СДЭК в пункты выдачи по всей стране.",
  },
  {
    icon: Package,
    title: "Большой выбор",
    text: "Тысячи товаров от магазинов и частных продавцов в одном каталоге.",
  },
] as const;

export function TrustSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
      <div className="mb-8 max-w-xl">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Почему выбирают {APP_NAME}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Покупайте спокойно — мы держим фокус на надёжности и удобстве.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {trustItems.map((item, index) => (
          <div
            key={item.title}
            className="animate-fade-up rounded-2xl border border-border bg-card/60 p-5 sm:p-6"
            style={{ animationDelay: `${80 + index * 70}ms` }}
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <item.icon className="size-5" aria-hidden />
            </div>
            <h3 className="mt-4 font-heading text-base font-medium sm:text-lg">
              {item.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
