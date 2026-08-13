"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { APP_NAME, ROUTES } from "@/lib/constants";

const sellerBenefits = [
  "Разместить товар за несколько минут",
  "Управление товарами в личном кабинете",
  "Доставка через СДЭК",
] as const;

export function HomeSellerCta() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
      <Card className="overflow-hidden border border-border bg-card/90 ring-1 ring-primary/20 hover:translate-y-0 hover:shadow-card-hover">
        <CardContent className="grid gap-8 p-6 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] sm:items-center sm:gap-10 sm:p-8 lg:p-10">
          <div className="max-w-lg">
            <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              Готовы продавать на {APP_NAME}?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Откройте кабинет продавца и разместите первый товар за минуту.
            </p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {sellerBenefits.map((text) => (
                <li
                  key={text}
                  className="flex items-start gap-2.5 text-sm text-foreground"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="size-3" strokeWidth={2.5} aria-hidden />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <Button
              size="lg"
              className="rounded-xl sm:min-w-[220px]"
              nativeButton={false}
              render={
                <Link
                  href={ROUTES.SELLER_NEW_PRODUCT}
                  onClick={() =>
                    trackEvent({
                      event: ANALYTICS_EVENTS.CTA_SELL_CLICK,
                      route: ROUTES.HOME,
                      entityId: "seller_block",
                    })
                  }
                />
              }
            >
              Добавить товар
              <ArrowRight data-icon="inline-end" />
            </Button>
            <p className="text-center text-xs text-muted-foreground sm:text-right">
              Нужен кабинет продавца — система направит при входе.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
