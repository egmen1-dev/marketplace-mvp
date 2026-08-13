import Link from "next/link";

import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import type { SellerBalanceDto } from "@/lib/finance/types";
import { isSellerPayoutEnabled } from "@/lib/seller-payout/flags";

type SellerBalancePanelProps = {
  balance: SellerBalanceDto;
  currency?: string;
  payoutEnabled?: boolean;
};

export function SellerBalancePanel({
  balance,
  currency = "RUB",
  payoutEnabled = isSellerPayoutEnabled(),
}: SellerBalancePanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className="grid gap-4 sm:grid-cols-3"
        data-testid="seller-balance-panel"
      >
        <article className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Ожидается</p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
            {formatPrice(balance.pendingAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Деньги станут доступны после завершения сделки
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Доступно</p>
          <p
            className="mt-1 font-heading text-2xl font-semibold tabular-nums"
            data-testid="balance-available-amount"
          >
            {formatPrice(balance.availableAmount, currency)}
          </p>
          {payoutEnabled ? (
            <Link
              href={ROUTES.ACCOUNT_PAYOUTS}
              className="mt-3 inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
              data-testid="balance-withdraw-btn"
            >
              Вывести деньги
            </Link>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              После подтверждения покупателем
            </p>
          )}
        </article>
        <article className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Получено</p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
            {formatPrice(balance.paidAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {payoutEnabled ? "История выплат в разделе выводов" : "История выплат — скоро"}
          </p>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-2" data-testid="balance-education">
        <article className="rounded-2xl border border-dashed border-border p-4 text-sm">
          <p className="font-medium">Почему деньги ожидаются?</p>
          <p className="mt-2 text-muted-foreground">
            Мы удерживаем оплату до завершения сделки, чтобы защитить покупателя
            и продавца. После подтверждения получения товара деньги становятся
            доступны.
          </p>
        </article>
        <article className="rounded-2xl border border-dashed border-border p-4 text-sm">
          <p className="font-medium">Почему нельзя вывести сразу?</p>
          <p className="mt-2 text-muted-foreground">
            Средства становятся доступными после завершения заказа. Это помогает
            обеспечить безопасную сделку.
          </p>
        </article>
      </div>
    </div>
  );
}
