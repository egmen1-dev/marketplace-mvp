import { AdminAiCommandCenterPanel } from "@/features/ai-experience";
import {
  getAdminAiCommandCenterDashboard,
  isAiExperienceEnabled,
} from "@/lib/ai-experience";

export const metadata = {
  title: "AI Command Center",
};

export default async function AdminAiCenterPage() {
  const data = isAiExperienceEnabled()
    ? await getAdminAiCommandCenterDashboard()
    : {
        enabled: false,
        marketplaceHealth: [],
        topOpportunities: [],
        activeStrategies: [],
        executionProgress: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          AI Command Center
        </h2>
        <p className="text-sm text-muted-foreground">
          Intelligence · Operator · Execution в едином admin-опыте. Advisory only.
        </p>
      </div>
      <AdminAiCommandCenterPanel data={data} />
    </div>
  );
}
