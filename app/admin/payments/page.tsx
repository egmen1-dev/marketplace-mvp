import { AdminPaymentsPanel } from "@/features/marketplace-launch-readiness";
import {
  getPaymentProductionHealth,
  isMarketplaceLaunchReadinessEnabled,
} from "@/lib/marketplace-launch-readiness";

export const metadata = { title: "Payments" };

export default async function AdminPaymentsPage() {
  const health = isMarketplaceLaunchReadinessEnabled()
    ? await getPaymentProductionHealth()
    : {
        enabled: false,
        stripeConfigured: false,
        webhookSecretConfigured: false,
        publishableKeyConfigured: false,
        pendingCount: 0,
        failedCount: 0,
        cancelledCount: 0,
        succeededToday: 0,
        checks: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Payment production
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Stripe configuration, pending/failed payments, webhook readiness
        </p>
      </div>
      <AdminPaymentsPanel health={health} />
    </div>
  );
}
