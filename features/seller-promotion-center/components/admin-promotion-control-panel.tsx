import type { AdminPromotionControlExtension } from "@/lib/seller-promotion-center/types";
import { formatPrice } from "@/features/products/mappers";

type AdminPromotionControlPanelProps = {
  data: AdminPromotionControlExtension;
};

export function AdminPromotionControlPanel({
  data,
}: AdminPromotionControlPanelProps) {
  if (!data.enabled) return null;

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
      data-testid="admin-promotion-control-panel"
    >
      <h3 className="font-heading text-base font-medium">
        Promotion Control Center
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Рекламный оборот" value={formatPrice(data.adSpendTotal, "RUB")} />
        <Stat label="Доход площадки" value={formatPrice(data.platformRevenue, "RUB")} />
        <Stat label="Активные продавцы" value={String(data.activeSellers)} />
        <Stat
          label="Лучшие категории"
          value={data.topCategories.slice(0, 2).join(", ") || "—"}
        />
      </div>
      {data.sellerRows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Продавец</th>
                <th className="py-2 pr-4 font-medium">Расход</th>
                <th className="py-2 pr-4 font-medium">GMV</th>
                <th className="py-2 pr-4 font-medium">ROI</th>
                <th className="py-2 font-medium">Кампании</th>
              </tr>
            </thead>
            <tbody>
              {data.sellerRows.map((row) => (
                <tr key={row.sellerId} className="border-b border-border/60">
                  <td className="py-2 pr-4">{row.sellerName}</td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatPrice(row.spend, "RUB")}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {formatPrice(row.gmv, "RUB")}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {row.roiPercent != null
                      ? `${Math.round(row.roiPercent)}%`
                      : "—"}
                  </td>
                  <td className="py-2 tabular-nums">{row.campaignCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  );
}
