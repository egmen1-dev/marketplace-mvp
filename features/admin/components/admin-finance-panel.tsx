import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/features/products/mappers";
import type { AdminFinanceDashboard } from "@/lib/finance/types";
import { ROUTES } from "@/lib/constants";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидание",
  PAID: "Оплачено",
  HELD: "Удержано",
  RELEASED: "Выпущено",
  REFUNDED: "Возврат",
  DISPUTED: "Спор",
};

type AdminFinancePanelProps = {
  data: AdminFinanceDashboard;
};

export function AdminFinancePanel({ data }: AdminFinancePanelProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="admin-finance-panel">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Оборот" value={formatPrice(data.turnover, "RUB")} />
        <MetricCard
          label="Комиссия"
          value={formatPrice(data.commissionTotal, "RUB")}
        />
        <MetricCard label="Pending транзакции" value={String(data.pendingCount)} />
        <MetricCard label="Открытые споры" value={String(data.disputeCount)} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Заказ</th>
              <th className="px-4 py-3 font-medium">Продавец</th>
              <th className="px-4 py-3 font-medium">Оборот</th>
              <th className="px-4 py-3 font-medium">Комиссия</th>
              <th className="px-4 py-3 font-medium">Продавцу</th>
              <th className="px-4 py-3 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Транзакций пока нет
                </td>
              </tr>
            ) : (
              data.rows.map((row) => (
                <tr key={row.transactionId} className="border-b border-border/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`${ROUTES.ADMIN_ORDERS}/${row.orderId}`}
                      className="font-medium hover:text-primary"
                    >
                      {row.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.sellerName}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatPrice(row.grossAmount, "RUB")}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatPrice(row.commissionAmount, "RUB")}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatPrice(row.sellerAmount, "RUB")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">
                      {STATUS_LABELS[row.status] ?? row.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
        {value}
      </p>
    </article>
  );
}
