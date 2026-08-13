import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerCommandCenterPanel } from "@/features/marketplace-command-center";
import { ROUTES } from "@/lib/constants";
import {
  getSellerCommandCenterDashboard,
  isMarketplaceCommandCenterEnabled,
} from "@/lib/marketplace-command-center";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Command Center",
};

export default async function AccountCommandCenterPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_COMMAND_CENTER);
  const data = isMarketplaceCommandCenterEnabled()
    ? await getSellerCommandCenterDashboard(seller.sellerProfileId)
    : {
        enabled: false,
        title: "Command Center",
        health: {
          growthScore: null,
          trustScore: null,
          qualityScore: null,
          learningScore: null,
        },
        aiSummary: "MARKETPLACE_COMMAND_CENTER_ENABLED=false",
        nextAction: null,
        opportunities: [],
        whatWorks: [],
        topPriorities: [],
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {data.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Единый Marketplace AI OS — Growth, Trust, Learning, Promotion,
          Execution без новых алгоритмов.
        </p>
      </div>
      <SellerCommandCenterPanel data={data} />
    </div>
  );
}
