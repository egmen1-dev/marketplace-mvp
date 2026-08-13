import { redirect } from "next/navigation";

import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerStartPanel } from "@/features/seller-first-entry";
import { ROUTES } from "@/lib/constants";
import {
  getSellerFirstEntryDashboard,
  isSellerFirstEntryEnabled,
} from "@/lib/seller-first-entry";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Старт продавца",
};

export default async function AccountSellerStartPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_SELLER_START);
  const data = isSellerFirstEntryEnabled()
    ? await getSellerFirstEntryDashboard(seller.sellerProfileId)
    : {
        enabled: false,
        showWelcome: false,
        showNextStep: false,
        step: "SELLER_START" as const,
        progressCurrent: 0,
        progressTotal: 5,
        journey: [],
        guide: {
          headline: "",
          why: "",
          actions: [],
          ctaLabel: "",
          ctaHref: ROUTES.ACCOUNT,
          tone: "info" as const,
        },
        experience: null,
        qualityScore: 0,
      };

  if (data.enabled && !data.showWelcome && data.step === "FIRST_PAYOUT") {
    redirect(ROUTES.ACCOUNT_COMMAND_CENTER);
  }

  return (
    <div className="flex flex-col gap-6">
      <SellerStartPanel data={data} />
    </div>
  );
}
