import { AdminCommandCenterPanel } from "@/features/marketplace-command-center";
import {
  getAdminCommandCenterDashboard,
  isMarketplaceCommandCenterEnabled,
} from "@/lib/marketplace-command-center";

export const metadata = {
  title: "Command Center",
};

export default async function AdminCommandCenterPage() {
  const data = isMarketplaceCommandCenterEnabled()
    ? await getAdminCommandCenterDashboard()
    : {
        enabled: false,
        marketplaceHealth: [],
        aiPriorities: [],
        executionStatus: [],
        learning: [],
        trust: [],
        revenueOpportunities: [],
        topPriorities: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Marketplace Command Center
        </h2>
        <p className="text-sm text-muted-foreground">
          Единый admin-слой AI OS: Intelligence, Operator, Execution, Learning,
          Trust, Revenue.
        </p>
      </div>
      <AdminCommandCenterPanel data={data} />
    </div>
  );
}
