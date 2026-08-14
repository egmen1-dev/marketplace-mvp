import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerJourneyCard } from "@/features/seller-journey";
import { ROUTES } from "@/lib/constants";
import {
  getSellerJourneyDashboard,
  isSellerJourneyEnabled,
} from "@/lib/seller-journey";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Рост продаж",
};

export default async function AccountGrowthPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_GROWTH);
  const data = isSellerJourneyEnabled()
    ? await getSellerJourneyDashboard(seller.sellerProfileId)
    : {
        enabled: false,
        step: "NOT_STARTED" as const,
        stepLabel: "SELLER_JOURNEY_ENABLED=false",
        progressPercent: 0,
        progressCurrent: 0,
        progressTotal: 6,
        checklist: [],
        coach: {
          headline: "",
          why: "",
          body: "",
          bullets: [],
          ctaLabel: "",
          ctaHref: ROUTES.ACCOUNT,
          tone: "info" as const,
        },
        milestones: [],
        nextAction: null,
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Рост продаж
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Единый путь продавца — от первого товара до выплаты с AI-подсказками на
          каждом этапе.
        </p>
      </div>
      <SellerJourneyCard data={data} />
    </div>
  );
}
