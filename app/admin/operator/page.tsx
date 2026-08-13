import { AdminMarketplaceOperatorPanel } from "@/features/admin/components/admin-marketplace-operator-panel";
import {
  getMarketplaceOperatorDashboard,
  isMarketplaceOperatorEnabled,
} from "@/lib/marketplace-operator";

export const metadata = {
  title: "Marketplace Operator",
};

export default async function AdminOperatorPage() {
  const data = isMarketplaceOperatorEnabled()
    ? await getMarketplaceOperatorDashboard()
    : {
        enabled: false,
        status: {
          headline: "Marketplace Operator выключен",
          summary: "MARKETPLACE_OPERATOR_ENABLED=false",
          healthScore: 0,
          topTaskCount: 0,
        },
        diagnoses: [],
        strategies: [],
        actionPlans: [],
        topProblems: [],
        recommendedActions: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          AI Marketplace Operator
        </h2>
        <p className="text-sm text-muted-foreground">
          Intelligence отвечает «что происходит?» — Operator отвечает «что делать
          дальше?» Только advisory, human approval обязателен.
        </p>
      </div>
      <AdminMarketplaceOperatorPanel data={data} />
    </div>
  );
}
