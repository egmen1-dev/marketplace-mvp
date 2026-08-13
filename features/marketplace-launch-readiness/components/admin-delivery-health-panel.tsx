import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LaunchChecksList } from "@/features/marketplace-launch-readiness/components/launch-checks-list";
import type { DeliveryProductionHealth } from "@/lib/marketplace-launch-readiness/types";

type AdminDeliveryHealthPanelProps = {
  health: DeliveryProductionHealth;
};

export function AdminDeliveryHealthPanel({ health }: AdminDeliveryHealthPanelProps) {
  if (!health.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_LAUNCH_READINESS_ENABLED=false
      </p>
    );
  }

  const providerTone =
    health.providerStatus === "OK"
      ? "default"
      : health.providerStatus === "MOCK"
        ? "secondary"
        : "destructive";

  return (
    <div className="flex flex-col gap-6" data-testid="admin-delivery-health-panel">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Provider
            <Badge variant={providerTone}>{health.providerStatus}</Badge>
          </CardTitle>
          <CardDescription>
            CDEK {health.cdekConfigured ? "live credentials" : "mock fallback"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">In transit</p>
            <p className="font-heading text-2xl font-semibold">{health.inTransit}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="font-heading text-2xl font-semibold">{health.overdue}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Problems</p>
            <p className="font-heading text-2xl font-semibold">{health.problems}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery checks</CardTitle>
        </CardHeader>
        <CardContent>
          <LaunchChecksList checks={health.checks} />
        </CardContent>
      </Card>
    </div>
  );
}
