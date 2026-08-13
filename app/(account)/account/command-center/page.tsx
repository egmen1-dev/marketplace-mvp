import { SellerJourneyPanel } from "@/features/seller-lifecycle";
import { SellerFirstEntryBannerSlot } from "@/features/seller-first-entry";
import { SellerJourneyCard } from "@/features/seller-journey";
import { ROUTES } from "@/lib/constants";
import {
  getSellerLifecycleDashboard,
  isSellerLifecycleEnabled,
} from "@/lib/seller-lifecycle";
import {
  getSellerJourneyDashboard,
  isSellerJourneyEnabled,
} from "@/lib/seller-journey";
import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Аналитика",
};

export default async function AccountCommandCenterPage() {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_COMMAND_CENTER);

  const [journeyUx, lifecycle] = await Promise.all([
    isSellerJourneyEnabled()
      ? getSellerJourneyDashboard(seller.sellerProfileId)
      : Promise.resolve(null),
    isSellerLifecycleEnabled() && !isSellerJourneyEnabled()
      ? getSellerLifecycleDashboard(seller.sellerProfileId)
      : Promise.resolve(null),
  ]);

  const lifecycleFallback = {
    enabled: false,
    stage: "NOT_STARTED" as const,
    stageLabel: "SELLER_LIFECYCLE_ENABLED=false",
    progressCurrent: 0,
    progressTotal: 8,
    steps: [],
    coach: {
      headline: "Аналитика",
      body: "SELLER_LIFECYCLE_ENABLED=false",
      bullets: [],
      ctaLabel: "",
      ctaHref: ROUTES.ACCOUNT,
      tone: "info" as const,
    },
    milestones: [],
    nextStep: null,
  };

  return (
    <div className="flex flex-col gap-6">
      {!isSellerJourneyEnabled() ? (
        <SellerFirstEntryBannerSlot sellerProfileId={seller.sellerProfileId} />
      ) : null}
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Аналитика
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Показатели магазина и динамика продаж. Подсказки по пути продавца — в
          разделе «AI помощник».
        </p>
      </div>
      {journeyUx?.enabled ? (
        <SellerJourneyCard data={journeyUx} compact />
      ) : (
        <SellerJourneyPanel data={lifecycle ?? lifecycleFallback} />
      )}
    </div>
  );
}
