import { AdminMarketplaceCommunicationPanel } from "@/features/admin/components/admin-marketplace-communication-panel";
import {
  getMarketplaceCommunicationDashboard,
  isMarketplaceCommunicationEnabled,
} from "@/lib/marketplace-communication";

export const metadata = {
  title: "Marketplace Communication",
};

export default async function AdminCommunicationPage() {
  const data = isMarketplaceCommunicationEnabled()
    ? await getMarketplaceCommunicationDashboard()
    : {
        enabled: false,
        activeCampaigns: [],
        audiences: [],
        templates: [],
        pendingApproval: [],
        sequences: [],
        results: {
          campaignsActive: 0,
          messagesPendingApproval: 0,
          messagesSent: 0,
          estimatedClicks: 0,
          headlines: ["MARKETPLACE_COMMUNICATION_ENABLED=false"],
        },
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Growth Communication Engine
        </h2>
        <p className="text-sm text-muted-foreground">
          Execution говорит «что сделать» — Communication отвечает «как связаться,
          что отправить, когда напомнить». Отправка только после подтверждения
          человека.
        </p>
      </div>
      <AdminMarketplaceCommunicationPanel data={data} />
    </div>
  );
}
