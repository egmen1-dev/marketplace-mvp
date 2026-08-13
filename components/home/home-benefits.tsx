import { Percent, Sparkles, Store, Truck } from "lucide-react";

const BENEFITS = [
  {
    icon: Percent,
    title: "Выгодные цены",
    text: "Сравнивайте предложения магазинов и частных продавцов.",
  },
  {
    icon: Truck,
    title: "Доставка СДЭК",
    text: "ПВЗ или курьер — расчёт при оформлении заказа.",
  },
  {
    icon: Store,
    title: "Тысячи продавцов",
    text: "От крупных магазинов до частных объявлений в одном каталоге.",
  },
  {
    icon: Sparkles,
    title: "Умный поиск",
    text: "Находите товар по названию, категории или бренду за секунды.",
  },
] as const;

export function HomeBenefits() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 max-w-xl">
        <h2 className="home-section-title font-heading font-semibold tracking-tight">
          Почему покупают на Лот
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Маркетплейс с ассортиментом, доставкой и защитой покупателя.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {BENEFITS.map((item, index) => (
          <article
            key={item.title}
            className="animate-fade-up flex flex-col rounded-2xl border border-border bg-card/80 p-5 ring-1 ring-border/60"
            style={{ animationDelay: `${60 + index * 50}ms` }}
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <item.icon className="size-5" aria-hidden />
            </div>
            <h3 className="mt-4 font-heading text-base font-semibold">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {item.text}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
