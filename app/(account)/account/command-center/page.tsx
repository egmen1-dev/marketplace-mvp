import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerJourneyPanel } from "@/features/seller-lifecycle";
import { ROUTES } from "@/lib/constants";
import {
  getSellerLifecycleDashboard,
  isSellerLifecycleEnabled,
} from "@/lib/seller-lifecycle";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "AI помощник",
};

export default async function AccountCommandCenterPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_COMMAND_CENTER);
  const journey = isSellerLifecycleEnabled()
    ? await getSellerLifecycleDashboard(seller.sellerProfileId)
    : {
        enabled: false,
        stage: "NOT_STARTED" as const,
        stageLabel: "SELLER_LIFECYCLE_ENABLED=false",
        progressCurrent: 0,
        progressTotal: 8,
        steps: [],
        coach: {
          headline: "AI помощник",
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
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          AI помощник
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ваш путь продавца — от первого товара до первой выплаты с подсказками
          на каждом этапе.
        </p>
      </div>
      <SellerJourneyPanel data={journey} />
    </div>
  );
}
