import { AdminContentQualityPanel } from "@/features/marketplace-content-quality";
import {
  getAdminContentQualityDashboard,
  isMarketplaceContentQualityEnabled,
} from "@/lib/marketplace-content-quality";

export const metadata = { title: "Content Quality Center" };

export default async function AdminContentQualityPage() {
  const enabled = isMarketplaceContentQualityEnabled();
  const dashboard = enabled
    ? await getAdminContentQualityDashboard()
    : {
        enabled: false,
        averageOverall: 0,
        averagePhotoQuality: 0,
        averageDescriptionQuality: 0,
        averageSeoQuality: 0,
        averageConsistency: 0,
        hardGateFailures: [],
        manipulationAttempts: 0,
        worstCategories: [],
        bestCategories: [],
        providerBreakdown: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Content Quality Center
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Commercial Quality Score, quality gates и critic evidence (advisory / experimental)
        </p>
      </div>
      <AdminContentQualityPanel dashboard={dashboard} />
    </div>
  );
}
