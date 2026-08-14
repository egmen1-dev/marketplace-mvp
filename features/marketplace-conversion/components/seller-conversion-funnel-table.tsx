import type { FunnelStepDisplay } from "@/lib/marketplace-conversion/funnel";
import { pctRate } from "@/lib/analytics/funnel-metrics";

type SellerConversionFunnelTableProps = {
  steps: FunnelStepDisplay[];
};

/** Spec §3 — seller conversion funnel table in Russian. */
export function SellerConversionFunnelTable({ steps }: SellerConversionFunnelTableProps) {
  const rows = steps.filter((s) =>
    ["homepage", "product", "cart", "checkout", "payment"].includes(s.id),
  );

  if (rows.length === 0) return null;

  const traffic = rows[0]?.uniqueVisitors ?? 0;

  return (
    <div className="mt-4 overflow-x-auto" data-testid="seller-conversion-funnel-table">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">Этап</th>
            <th className="pb-2 pr-3 font-medium">Кол-во</th>
            <th className="pb-2 font-medium">Конверсия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-2 pr-3">{row.label}</td>
              <td className="py-2 pr-3 tabular-nums">{row.uniqueVisitors || row.count}</td>
              <td className="py-2 tabular-nums">
                {pctRate(row.uniqueVisitors || row.count, traffic) ?? "—"}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
