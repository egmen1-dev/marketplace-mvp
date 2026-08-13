import { AdminDeliveryHealthPanel } from "@/features/marketplace-launch-readiness";
import {
  getDeliveryProductionHealth,
  isMarketplaceLaunchReadinessEnabled,
} from "@/lib/marketplace-launch-readiness";

export const metadata = { title: "Delivery Health" };

export default async function AdminDeliveryHealthPage() {
  const health = isMarketplaceLaunchReadinessEnabled()
    ? await getDeliveryProductionHealth()
    : {
        enabled: false,
        providerStatus: "ERROR" as const,
        cdekConfigured: false,
        deliveryLayerEnabled: false,
        inTransit: 0,
        overdue: 0,
        problems: 0,
        checks: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Delivery health
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Provider status, CDEK credentials, shipment metrics
        </p>
      </div>
      <AdminDeliveryHealthPanel health={health} />
    </div>
  );
}
