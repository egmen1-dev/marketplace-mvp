import { AdminMarketplaceIntelligencePanel } from "@/features/admin/components/admin-marketplace-intelligence-panel";
import {
  getMarketplaceIntelligenceDashboard,
  isMarketplaceIntelligenceEnabled,
} from "@/lib/marketplace-intelligence";

export const metadata = {
  title: "Marketplace Intelligence",
};

export default async function AdminIntelligencePage() {
  const data = isMarketplaceIntelligenceEnabled()
    ? await getMarketplaceIntelligenceDashboard()
    : {
        enabled: false,
        health: {
          gmv: 0,
          sellers: 0,
          buyers: 0,
          conversionRate: null,
          activeProducts: 0,
          orders: 0,
        },
        signals: [],
        opportunities: [],
        problems: [],
        recommendations: [],
        revenueOpportunities: [],
        buyerDemand: null,
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          AI Marketplace Brain
        </h2>
        <p className="text-sm text-muted-foreground">
          Центральный advisory-слой: buyer, seller, promotion, quality, analytics
          и finance — без изменения ранжирования и расчётов.
        </p>
      </div>
      <AdminMarketplaceIntelligencePanel data={data} />
    </div>
  );
}
