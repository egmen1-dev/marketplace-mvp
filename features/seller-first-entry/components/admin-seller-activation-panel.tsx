import type { AdminSellerActivation } from "@/lib/seller-first-entry/types";

type AdminSellerActivationPanelProps = {
  data: AdminSellerActivation;
};

export function AdminSellerActivationPanel({ data }: AdminSellerActivationPanelProps) {
  if (!data.enabled) {
    return (
      <p className="text-sm text-muted-foreground">SELLER_FIRST_ENTRY_ENABLED=false</p>
    );
  }

  const rows = [
    { label: "Новые продавцы (30 дней)", value: data.newSellers },
    { label: "Начали onboarding", value: data.startedOnboarding },
    { label: "Завершили onboarding", value: data.completedOnboarding },
    { label: "Создали первый товар", value: data.createdFirstProduct },
    { label: "Первая продажа", value: data.firstSale },
  ];

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="admin-seller-activation"
    >
      <h3 className="font-heading text-lg font-semibold">Seller Activation</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
