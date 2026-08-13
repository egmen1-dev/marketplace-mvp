import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LaunchChecksList } from "@/features/marketplace-launch-readiness/components/launch-checks-list";
import type { UxHealthReport } from "@/lib/marketplace-launch-readiness/types";

type AdminUxHealthPanelProps = {
  report: UxHealthReport;
};

export function AdminUxHealthPanel({ report }: AdminUxHealthPanelProps) {
  if (!report.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_LAUNCH_READINESS_ENABLED=false
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-ux-health-panel">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Without photos
            </CardTitle>
            <CardContent className="p-0 pt-2 text-2xl font-semibold tabular-nums">
              {report.productsWithoutPhotos}
            </CardContent>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Draft products
            </CardTitle>
            <CardContent className="p-0 pt-2 text-2xl font-semibold tabular-nums">
              {report.draftProducts}
            </CardContent>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Empty descriptions
            </CardTitle>
            <CardContent className="p-0 pt-2 text-2xl font-semibold tabular-nums">
              {report.emptyDescriptions}
            </CardContent>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UX checks</CardTitle>
        </CardHeader>
        <CardContent>
          <LaunchChecksList checks={report.checks} />
        </CardContent>
      </Card>
    </div>
  );
}
