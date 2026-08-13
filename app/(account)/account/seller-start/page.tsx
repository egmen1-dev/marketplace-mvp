import { redirect } from "next/navigation";

import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerStartPanel } from "@/features/seller-first-entry";
import { SellerJourneyCard } from "@/features/seller-journey";
import { ROUTES } from "@/lib/constants";
import {
  getSellerFirstEntryDashboard,
  isSellerFirstEntryEnabled,
} from "@/lib/seller-first-entry";
import {
  getSellerJourneyDashboard,
  isSellerJourneyEnabled,
} from "@/lib/seller-journey";
import { isJourneyComplete } from "@/lib/seller-journey/progress";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Старт продавца",
};

export default async function AccountSellerStartPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_SELLER_START);

  const [firstEntry, journey] = await Promise.all([
    isSellerFirstEntryEnabled()
      ? getSellerFirstEntryDashboard(seller.sellerProfileId)
      : Promise.resolve(null),
    isSellerJourneyEnabled()
      ? getSellerJourneyDashboard(seller.sellerProfileId)
      : Promise.resolve(null),
  ]);

  const data =
    firstEntry ??
    ({
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
    } as const);

  if (journey?.enabled && isJourneyComplete(journey.step)) {
    redirect(ROUTES.ACCOUNT_GROWTH);
  }

  if (
    data.enabled &&
    !data.showWelcome &&
    data.step === "FIRST_PAYOUT" &&
    !journey?.enabled
  ) {
    redirect(ROUTES.ACCOUNT_COMMAND_CENTER);
  }

  return (
    <div className="flex flex-col gap-6">
      {data.enabled ? <SellerStartPanel data={data} /> : null}
      {journey?.enabled ? <SellerJourneyCard data={journey} /> : null}
      {!data.enabled && !journey?.enabled ? (
        <p className="text-sm text-muted-foreground">
          SELLER_FIRST_ENTRY_ENABLED=false · SELLER_JOURNEY_ENABLED=false
        </p>
      ) : null}
    </div>
  );
}
