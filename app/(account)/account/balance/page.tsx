import { redirect } from "next/navigation";

import { SellerPayoutEducation } from "@/components/trust";
import { AccountShell } from "@/features/account";
import { getSessionUser, loadUserAuthFromDb } from "@/features/auth";
import { getSellerBalanceView } from "@/features/finance";
import { formatPrice } from "@/features/products/mappers";
import { formatDateMoscowShort } from "@/lib/format/datetime";
import { ROUTES } from "@/lib/constants";
import { isTrustSafetyEnabled } from "@/lib/trust-safety";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Баланс",
};

export default async function AccountBalancePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.ACCOUNT_BALANCE)}`,
    );
  }

  const dbUser = await loadUserAuthFromDb(user.id);
  if (!dbUser?.sellerProfileId) {
    redirect(`${ROUTES.ACCOUNT}?sell=1`);
  }

  const balance = await getSellerBalanceView(dbUser.sellerProfileId);

  return (
    <AccountShell
      title="Баланс"
      description="Средства от продаж: ожидание и доступно к выводу (выплаты — позже)."
    >
      <div className="flex flex-col gap-6" data-testid="seller-balance">
        {isTrustSafetyEnabled() ? <SellerPayoutEducation /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface/50 p-5">
            <p className="text-sm text-muted-foreground">Ожидает завершения</p>
            <p
              className="mt-2 font-heading text-2xl font-semibold tracking-tight"
              data-testid="balance-pending"
            >
              {formatPrice(balance.pendingAmount, balance.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              После оплаты заказа, до статуса «Завершён»
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-5">
            <p className="text-sm text-muted-foreground">Доступно</p>
            <p
              className="mt-2 font-heading text-2xl font-semibold tracking-tight"
              data-testid="balance-available"
            >
              {formatPrice(balance.availableAmount, balance.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              После COMPLETED заказа (за вычетом комиссии)
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-heading text-base font-medium">Операции</h2>
          </div>
          {balance.transactions.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              Пока нет начислений — они появятся после первой оплаты покупателя.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {balance.transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {tx.type === "SALE"
                        ? "Продажа"
                        : tx.type === "RELEASE"
                          ? "Разблокировка"
                          : tx.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateMoscowShort(tx.createdAt)} · заказ{" "}
                      {tx.orderId.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-medium">
                      {formatPrice(tx.sellerAmount, balance.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      комиссия{" "}
                      {formatPrice(tx.commissionAmount, balance.currency)} ·
                      брутто {formatPrice(tx.grossAmount, balance.currency)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AccountShell>
  );
}
