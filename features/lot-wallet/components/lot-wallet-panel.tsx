"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { SellerPayoutPanel } from "@/features/seller-payout";
import { SellerBalancePanel } from "@/features/finance/components/seller-balance-panel";
import { ROUTES } from "@/lib/constants";
import type { SellerBalanceDto } from "@/lib/finance/types";
import type { SellerPayoutDashboard } from "@/lib/seller-payout/types";
import type {
  WalletHistoryFilter,
  WalletOverview,
  WalletTab,
} from "@/lib/lot-wallet/types";
import { WalletTopUpForm } from "@/features/lot-wallet/components/wallet-topup-form";
import { trackWalletView } from "@/lib/lot-wallet/analytics";
import { cn } from "@/lib/utils";

const TABS: { id: WalletTab; label: string }[] = [
  { id: "overview", label: "Обзор" },
  { id: "topup", label: "Пополнить" },
  { id: "withdraw", label: "Вывести" },
  { id: "history", label: "История" },
  { id: "methods", label: "Способы оплаты" },
];

type LotWalletPanelProps = {
  overview: WalletOverview;
  balance: SellerBalanceDto | null;
  payoutData: SellerPayoutDashboard;
  payoutEnabled: boolean;
  isSeller: boolean;
  history: Array<{
    id: string;
    direction: "CREDIT" | "DEBIT";
    amount: number;
    title: string;
    subtitle: string | null;
    createdAt: string;
  }>;
  historyFilter: WalletHistoryFilter;
};

function formatRub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

export function LotWalletPanel({
  overview,
  balance,
  payoutData,
  payoutEnabled,
  isSeller,
  history,
  historyFilter,
}: LotWalletPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as WalletTab | null) ?? "overview";
  const topupStatus = searchParams.get("topup");

  useEffect(() => {
    trackWalletView(tab);
  }, [tab]);

  const topupSuccessMessage =
    topupStatus === "success"
      ? "Пополнение прошло успешно. Средства появятся в истории после подтверждения оплаты."
      : topupStatus === "canceled"
        ? "Оплата отменена. Сумма не была списана."
        : undefined;

  function setTab(next: WalletTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.push(`${ROUTES.ACCOUNT_WALLET}?${params.toString()}`);
  }

  const buckets = overview.buckets;

  return (
    <div className="flex flex-col gap-6" data-testid="lot-wallet-panel">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Кошелёк ЛОТ
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Пополнение, покупки, доход от продаж и вывод — в одном месте.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-card p-6">
            <p className="text-sm text-muted-foreground">Общий доступный баланс</p>
            <p className="font-heading text-3xl font-semibold tabular-nums">
              {formatRub(buckets.totalAvailableDisplay)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setTab("topup")}>
                Пополнить
              </Button>
              {isSeller ? (
                <Button size="sm" variant="outline" onClick={() => setTab("withdraw")}>
                  Вывести
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Доступно для покупок</p>
              <p className="font-heading text-xl font-semibold tabular-nums">
                {formatRub(buckets.spendableAmount)}
              </p>
            </div>
            {isSeller ? (
              <>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Доступно для вывода</p>
                  <p className="font-heading text-xl font-semibold tabular-nums">
                    {formatRub(buckets.withdrawableAmount)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Ожидается после продаж</p>
                  <p className="font-heading text-xl font-semibold tabular-nums">
                    {formatRub(buckets.pendingFromSales)}
                  </p>
                </div>
              </>
            ) : null}
            {buckets.bonusAmount > 0 ? (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Бонусы ЛОТ</p>
                <p className="font-heading text-xl font-semibold tabular-nums">
                  {formatRub(buckets.bonusAmount)}
                </p>
              </div>
            ) : null}
          </div>

          {balance && isSeller ? (
            <SellerBalancePanel balance={balance} payoutEnabled={payoutEnabled} />
          ) : null}

          {overview.recentEntries.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">Недавние операции</p>
                <button
                  type="button"
                  className="text-sm text-primary"
                  onClick={() => setTab("history")}
                >
                  Вся история
                </button>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {overview.recentEntries.map((entry) => (
                  <li key={entry.id} className="flex justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium">{entry.title}</p>
                      {entry.subtitle ? (
                        <p className="text-muted-foreground">{entry.subtitle}</p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "tabular-nums font-medium",
                        entry.direction === "CREDIT" ? "text-green-600" : "text-foreground",
                      )}
                    >
                      {entry.direction === "CREDIT" ? "+" : "−"}
                      {formatRub(entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "topup" ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-heading text-lg font-semibold">Пополнить кошелёк</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Пополненные средства можно тратить на покупки и продвижение, но нельзя вывести
            как доход от продаж.
          </p>
          <WalletTopUpForm onSuccessMessage={topupSuccessMessage} />
        </div>
      ) : null}

      {tab === "withdraw" && isSeller ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <p>
              Доступно к выводу:{" "}
              <span className="font-semibold">{formatRub(buckets.withdrawableAmount)}</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              Пополнения и бонусы вывести нельзя — только доход от завершённых продаж.
            </p>
          </div>
          <SellerPayoutPanel data={payoutData} />
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-medium">История операций</p>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Пока нет операций</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {history.map((entry) => (
                <li key={entry.id} className="flex justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{entry.title}</p>
                    {entry.subtitle ? (
                      <p className="text-xs text-muted-foreground">{entry.subtitle}</p>
                    ) : null}
                  </div>
                  <span className="tabular-nums">
                    {entry.direction === "CREDIT" ? "+" : "−"}
                    {formatRub(entry.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "methods" ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm">
          <h2 className="font-heading text-lg font-semibold">Способы оплаты</h2>
          <p className="mt-2 text-muted-foreground">
            Для покупок на маркетплейсе используется банковская карта через Stripe Checkout.
          </p>
          {isSeller ? (
            <p className="mt-2 text-muted-foreground">
              Реквизиты для вывода настраиваются во вкладке «Вывести».
            </p>
          ) : null}
          <Button className="mt-4" variant="outline" nativeButton={false} render={<Link href={ROUTES.CHECKOUT} />}>
            Перейти к оформлению заказа
          </Button>
        </div>
      ) : null}
    </div>
  );
}
