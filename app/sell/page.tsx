import Link from "next/link";
import { ArrowRight, PackagePlus, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Как продавать",
  description:
    "Откройте магазин на Лот: регистрация продавца, товары, заказы и доставка СДЭК.",
};

const steps = [
  {
    title: "Создайте аккаунт продавца",
    text: "Зарегистрируйтесь с типом «Продавец» или откройте магазин из профиля.",
  },
  {
    title: "Добавьте товары",
    text: "Заполните название, цену, фото и остаток — товар появится в каталоге.",
  },
  {
    title: "Получайте заказы",
    text: "Следите за статусами в кабинете и отправляйте через СДЭК.",
  },
] as const;

export default function SellPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium text-primary">Продавцам</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Как продавать на Лот
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Кабинет продавца уже готов: товары, склад, заказы и публичная витрина
          магазина. Начните с регистрации — остальное займёт несколько минут.
        </p>
      </div>

      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="rounded-2xl border border-border bg-card/50 p-4"
          >
            <p className="font-heading text-sm font-semibold text-primary">
              {index + 1}
            </p>
            <h2 className="mt-2 font-heading text-base font-semibold">
              {step.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {step.text}
            </p>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={`${ROUTES.AUTH_SIGN_UP}?role=SELLER`} />}
        >
          <Store data-icon="inline-start" />
          Стать продавцом
        </Button>
        <Button
          variant="outline"
          size="lg"
          nativeButton={false}
          render={<Link href={ROUTES.SELLER_DASHBOARD} />}
        >
          <PackagePlus data-icon="inline-start" />
          Кабинет продавца
        </Button>
        <Button
          variant="ghost"
          size="lg"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
        >
          Смотреть каталог
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}
