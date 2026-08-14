import { AdminUxOverviewDashboard } from "@/features/marketplace-ux-completion";
import {
  getAdminUxOverview,
  isMarketplaceUxCompletionEnabled,
} from "@/lib/marketplace-ux-completion";

export const metadata = {
  title: "Marketplace Overview",
};

export default async function AdminUxDashboardPage() {
  const enabled = isMarketplaceUxCompletionEnabled();
  const overview = enabled
    ? await getAdminUxOverview()
    : { enabled: false, healthBlocks: [], attention: [], aiTips: [] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Marketplace Overview
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Единый обзор здоровья маркетплейса, доверия и AI-рекомендаций
        </p>
      </div>
      <AdminUxOverviewDashboard overview={overview} />
    </div>
  );
}
