import { AdminBuyerIntelligencePanel } from "@/features/admin/components/admin-buyer-intelligence-panel";
import {
  getAdminBuyerIntelligenceSummary,
  isBuyerIntelligenceEnabled,
} from "@/lib/buyer-intelligence";

export const metadata = {
  title: "Buyer Intelligence",
};

export default async function AdminBuyersPage() {
  const summary = isBuyerIntelligenceEnabled()
    ? await getAdminBuyerIntelligenceSummary()
    : {
        popularIntents: [],
        unmetQueries: [],
        growingCategories: [],
        headlines: ["Buyer Intelligence Engine выключен"],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Buyer Intelligence
        </h2>
        <p className="text-sm text-muted-foreground">
          Понимание намерений покупателей — без влияния на ранжирование каталога.
        </p>
      </div>
      <AdminBuyerIntelligencePanel summary={summary} />
    </div>
  );
}
