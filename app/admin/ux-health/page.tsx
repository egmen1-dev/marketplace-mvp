import { AdminUxHealthPanel } from "@/features/marketplace-launch-readiness";
import {
  getUxHealthReport,
  isMarketplaceLaunchReadinessEnabled,
} from "@/lib/marketplace-launch-readiness";

export const metadata = { title: "UX Health" };

export default async function AdminUxHealthPage() {
  const report = isMarketplaceLaunchReadinessEnabled()
    ? await getUxHealthReport()
    : {
        enabled: false,
        productsWithoutPhotos: 0,
        draftProducts: 0,
        emptyDescriptions: 0,
        checks: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          UX health
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Empty states, missing media, content quality signals
        </p>
      </div>
      <AdminUxHealthPanel report={report} />
    </div>
  );
}
