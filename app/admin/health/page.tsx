import { AdminMarketplaceHealthDashboard } from "@/features/marketplace-launch-readiness";
import {
  getMarketplaceHealthDashboard,
  isMarketplaceLaunchReadinessEnabled,
} from "@/lib/marketplace-launch-readiness";

export const metadata = { title: "Marketplace Health" };

export default async function AdminHealthPage() {
  const data = isMarketplaceLaunchReadinessEnabled()
    ? await getMarketplaceHealthDashboard()
    : {
        enabled: false,
        ordersToday: 0,
        ordersFailed: 0,
        ordersPending: 0,
        paymentSuccessRate: 0,
        paymentFailures: 0,
        deliveryDelays: 0,
        sellersActive: 0,
        sellersBlocked: 0,
        reviewsCount: 0,
        moderationPending: 0,
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Marketplace health
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Orders, payments, delivery, sellers, trust — live operational metrics
        </p>
      </div>
      <AdminMarketplaceHealthDashboard data={data} />
    </div>
  );
}
