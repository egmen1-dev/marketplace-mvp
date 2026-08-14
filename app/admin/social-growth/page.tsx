import { AdminSocialGrowthDashboardView } from "@/features/marketplace-social-growth";
import {
  getAdminSocialGrowthDashboard,
  isMarketplaceSocialGrowthEnabled,
} from "@/lib/marketplace-social-growth";

export const metadata = { title: "Social Growth Center" };

export default async function AdminSocialGrowthPage() {
  const enabled = isMarketplaceSocialGrowthEnabled();
  const dashboard = enabled
    ? await getAdminSocialGrowthDashboard()
    : {
        enabled: false,
        topShareCards: [],
        topSharedProducts: [],
        creatorStats: [],
        opportunities: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Social Growth Center
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Вирусный контент, коллекции и возможности роста
        </p>
      </div>
      <AdminSocialGrowthDashboardView dashboard={dashboard} />
    </div>
  );
}
