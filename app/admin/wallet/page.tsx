import { prisma } from "@/lib/prisma";
import { toPriceNumber } from "@/features/products/mappers";

export const dynamic = "force-dynamic";

export const metadata = { title: "Кошельки пользователей" };

export default async function AdminWalletPage() {
  const [walletCount, ledgerCount, topupSum, promotionSum, payoutPending] =
    await Promise.all([
      prisma.userWallet.count(),
      prisma.walletLedgerEntry.count(),
      prisma.walletLedgerEntry.aggregate({
        where: { type: "BUYER_TOP_UP" },
        _sum: { amount: true },
      }),
      prisma.walletLedgerEntry.aggregate({
        where: { type: "PROMOTION_PURCHASE" },
        _sum: { amount: true },
      }),
      prisma.payoutRequest.count({
        where: { status: { in: ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING"] } },
      }),
    ]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Кошельки ЛОТ</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Обзор пользовательских кошельков, пополнений, внутренних покупок и выводов.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Кошельков</p>
          <p className="font-heading text-2xl font-semibold">{walletCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Операций в ledger</p>
          <p className="font-heading text-2xl font-semibold">{ledgerCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Пополнения (ledger)</p>
          <p className="font-heading text-2xl font-semibold">
            {toPriceNumber(topupSum._sum.amount ?? 0).toLocaleString("ru-RU")} ₽
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Продвижение (ledger)</p>
          <p className="font-heading text-2xl font-semibold">
            {toPriceNumber(promotionSum._sum.amount ?? 0).toLocaleString("ru-RU")} ₽
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <p>
          Активных заявок на вывод:{" "}
          <span className="font-semibold">{payoutPending}</span>
        </p>
        <p className="mt-2 text-muted-foreground">
          Произвольное изменение баланса админом не поддерживается — только ledger-события и
          payout workflow.
        </p>
      </div>
    </div>
  );
}
