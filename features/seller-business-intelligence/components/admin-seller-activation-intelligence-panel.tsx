import type { AdminSellerActivationIntelligence } from "@/lib/seller-business-intelligence/types";

type AdminSellerActivationIntelligencePanelProps = {
  data: AdminSellerActivationIntelligence;
};

export function AdminSellerActivationIntelligencePanel({
  data,
}: AdminSellerActivationIntelligencePanelProps) {
  if (!data.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        SELLER_BUSINESS_INTELLIGENCE_ENABLED=false
      </p>
    );
  }

  const rows = [
    { label: "Без товара", value: data.sellersWithoutProduct },
    { label: "Товар без продаж", value: data.sellersWithoutSales },
    { label: "Слабые карточки", value: data.sellersWithWeakCards },
    { label: "Готовы к продвижению", value: data.sellersPromotionReady },
    { label: "Ожидают выплаты", value: data.sellersAwaitingPayout },
  ];

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="admin-seller-activation-intelligence"
    >
      <h3 className="font-heading text-lg font-semibold">
        Seller Activation Intelligence
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        AI-слой: где продавцы застревают и где потенциал роста
      </p>
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
