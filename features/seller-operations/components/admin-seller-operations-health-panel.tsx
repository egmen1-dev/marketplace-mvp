import type { AdminOperationsHealth } from "@/lib/seller-operations/types";

type AdminSellerOperationsHealthPanelProps = {
  data: AdminOperationsHealth;
};

export function AdminSellerOperationsHealthPanel({
  data,
}: AdminSellerOperationsHealthPanelProps) {
  if (!data.enabled) {
    return (
      <p className="text-sm text-muted-foreground">SELLER_OPERATIONS_ENABLED=false</p>
    );
  }

  const rows = [
    {
      label: "Продавцы с нерешёнными задачами",
      value: data.sellersWithOpenTasks,
    },
    {
      label: "Просроченные заказы",
      value: data.sellersWithOverdueOrders,
    },
    {
      label: "Товары без продаж (20+ просмотров)",
      value: data.productsWithoutSales,
    },
    {
      label: "Потенциал роста (просмотры, 0 заказов)",
      value: data.growthPotentialSellers,
    },
  ];

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="admin-seller-operations-health"
    >
      <h3 className="font-heading text-lg font-semibold">Seller Operations Health</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Ежедневные операции: заказы, товары и приоритеты продавцов
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <article key={row.label} className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">{row.label}</p>
            <p className="mt-1 font-heading text-xl font-semibold tabular-nums">
              {row.value}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
