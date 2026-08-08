import Link from "next/link";
import {
  ArrowRight,
  PackagePlus,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSessionUser, loadUserAuthFromDb } from "@/features/auth";
import { APP_NAME, ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Как продавать",
  description:
    "Продавайте на Лот с тем же аккаунтом: товары, заказы и доставка СДЭК.",
};

const steps = [
  {
    title: "Войдите в свой аккаунт",
    text: "Отдельная регистрация продавца не нужна — используйте обычный профиль.",
  },
  {
    title: "Нажмите «Продать товар»",
    text: "Мы создадим профиль продавца и откроем форму нового объявления.",
  },
  {
    title: "Получайте заказы",
    text: "Следите за продажами в кабинете и отправляйте покупки через СДЭК.",
  },
] as const;

const benefits = [
  {
    icon: Store,
    title: "Один кабинет",
    text: "Покупки и продажи в одном аккаунте — как на Авито.",
  },
  {
    icon: Truck,
    title: "Доставка СДЭК",
    text: "Покупатель выбирает пункт выдачи при оформлении заказа.",
  },
  {
    icon: ShieldCheck,
    title: "Понятный старт",
    text: "Без сложной настройки — разместите товар за несколько минут.",
  },
] as const;

export default async function SellPage() {
  const session = await getSessionUser();
  let isSeller = false;
  if (session?.id) {
    const dbUser = await loadUserAuthFromDb(session.id);
    isSeller = Boolean(
      dbUser?.sellerProfileId &&
        (dbUser.role === "SELLER" || dbUser.role === "ADMIN"),
    );
  }

  const primaryHref = session
    ? isSeller
      ? ROUTES.ACCOUNT_PRODUCTS_NEW
      : `${ROUTES.ACCOUNT}?sell=1`
    : `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(`${ROUTES.ACCOUNT}?sell=1`)}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium text-primary">Продавцам</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Как продавать на {APP_NAME}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Один аккаунт для покупок и продаж. Нажмите «Продать товар» — откроется
          кабинет и создание объявления.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {benefits.map((item) => (
          <li
            key={item.title}
            className="rounded-2xl border border-border bg-card/50 p-4"
          >
            <item.icon className="size-5 text-primary" aria-hidden />
            <h2 className="mt-3 font-heading text-base font-semibold">
              {item.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {item.text}
            </p>
          </li>
        ))}
      </ul>

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

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={primaryHref} />}
        >
          <Store data-icon="inline-start" />
          {isSeller ? "Добавить товар" : "Продать товар"}
        </Button>
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={
                isSeller ? ROUTES.ACCOUNT_PRODUCTS : ROUTES.ACCOUNT_PRODUCTS_NEW
              }
            />
          }
        >
          <PackagePlus data-icon="inline-start" />
          Мои товары
        </Button>
        <Button
          variant="ghost"
          size="lg"
          nativeButton={false}
          render={<Link href={ROUTES.ACCOUNT} />}
        >
          Личный кабинет
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Уже продаёте — товары и заказы доступны в разделе «Продажи».
      </p>
    </div>
  );
}
