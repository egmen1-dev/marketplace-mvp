import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LaunchChecksList } from "@/features/marketplace-launch-readiness/components/launch-checks-list";
import type { PaymentProductionHealth } from "@/lib/marketplace-launch-readiness/types";

type AdminPaymentsPanelProps = {
  health: PaymentProductionHealth;
};

export function AdminPaymentsPanel({ health }: AdminPaymentsPanelProps) {
  if (!health.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_LAUNCH_READINESS_ENABLED=false
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-payments-panel">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{health.pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-2xl tabular-nums text-destructive">
              {health.failedCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription>Cancelled</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{health.cancelledCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardDescription>Succeeded today</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{health.succeededToday}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production checks</CardTitle>
          <CardDescription>
            Stripe {health.stripeConfigured ? "configured" : "missing"} · Webhook{" "}
            {health.webhookSecretConfigured ? "OK" : "missing"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LaunchChecksList checks={health.checks} testId="payment-checks" />
        </CardContent>
      </Card>
    </div>
  );
}
