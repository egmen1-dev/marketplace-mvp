import type { AdminDeliveryHealth, AdminShipmentRow } from "@/lib/marketplace-delivery/delivery/types";

type AdminDeliveryDashboardProps = {
  health: AdminDeliveryHealth;
  shipments: AdminShipmentRow[];
};

export function AdminDeliveryDashboard({
  health,
  shipments,
}: AdminDeliveryDashboardProps) {
  if (!health.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_DELIVERY_ENABLED=false
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-delivery-dashboard">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">В доставке</p>
          <p className="font-heading text-3xl font-semibold">{health.inTransit}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Просрочено</p>
          <p className="font-heading text-3xl font-semibold">{health.overdue}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Проблемы</p>
          <p className="font-heading text-3xl font-semibold">{health.problems}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Отправления</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 pr-4">Заказ</th>
                <th className="pb-2 pr-4">Продавец</th>
                <th className="pb-2 pr-4">Провайдер</th>
                <th className="pb-2 pr-4">Трек</th>
                <th className="pb-2">Статус</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((row) => (
                <tr key={row.orderId} className="border-t border-border/60">
                  <td className="py-2 pr-4">{row.orderNumber}</td>
                  <td className="py-2 pr-4">{row.sellerName}</td>
                  <td className="py-2 pr-4">{row.provider}</td>
                  <td className="py-2 pr-4">{row.trackingNumber ?? "—"}</td>
                  <td className="py-2">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
