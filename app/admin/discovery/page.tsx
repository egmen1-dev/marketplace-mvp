import { AdminDiscoveryDashboardView } from "@/features/marketplace-discovery";
import {
  getAdminDiscoveryDashboard,
  isMarketplaceDiscoveryEnabled,
} from "@/lib/marketplace-discovery";

export const metadata = { title: "Discovery Center" };

export default async function AdminDiscoveryPage() {
  const enabled = isMarketplaceDiscoveryEnabled();
  const dashboard = enabled
    ? await getAdminDiscoveryDashboard()
    : {
        enabled: false,
        topCollections: [],
        topClicks: [],
        opportunities: [],
        sectionViews: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Discovery Center
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Популярные подборки, CTR и возможности для контента
        </p>
      </div>
      <AdminDiscoveryDashboardView dashboard={dashboard} />
    </div>
  );
}
