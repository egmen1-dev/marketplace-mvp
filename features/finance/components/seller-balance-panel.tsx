import { formatPrice } from "@/features/products/mappers";
import type { SellerBalanceDto } from "@/lib/finance/types";

type SellerBalancePanelProps = {
  balance: SellerBalanceDto;
  currency?: string;
};

export function SellerBalancePanel({
  balance,
  currency = "RUB",
}: SellerBalancePanelProps) {
  return (
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
          Удержано до завершения заказа
        </p>
      </article>
      <article className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Доступно</p>
        <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
          {formatPrice(balance.availableAmount, currency)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          После подтверждения покупателем
        </p>
      </article>
      <article className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Получено</p>
        <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
          {formatPrice(balance.paidAmount, currency)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          История выплат — скоро
        </p>
      </article>
    </div>
  );
}
