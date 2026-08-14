import { AdminLaunchDashboard } from "@/features/marketplace-launch-readiness";
import {
  getLaunchChecklistReport,
  getLaunchReadinessReport,
  isMarketplaceLaunchReadinessEnabled,
} from "@/lib/marketplace-launch-readiness";

export const metadata = { title: "Launch Readiness" };

export default async function AdminLaunchPage() {
  const enabled = isMarketplaceLaunchReadinessEnabled();
  const [report, checklist] = enabled
    ? await Promise.all([getLaunchReadinessReport(), getLaunchChecklistReport()])
    : [
        {
          enabled: false,
          score: 0,
          label: "blocked" as const,
          headline: "MARKETPLACE_LAUNCH_READINESS_ENABLED=false",
          sections: [],
          failedCritical: [],
        },
        { enabled: false, items: [], readyCount: 0, totalCount: 0 },
      ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Launch readiness
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Final production audit — buyer, seller, payment, delivery, security, trust
        </p>
      </div>
      <AdminLaunchDashboard report={report} checklist={checklist} />
    </div>
  );
}
