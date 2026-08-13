import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerAiCenterPanel } from "@/features/ai-experience";
import { SellerTrustCoachPanel } from "@/features/trust-safety";
import {
  getSellerAiCenterDashboard,
  isAiExperienceEnabled,
} from "@/lib/ai-experience";
import { ROUTES } from "@/lib/constants";
import {
  getSellerTrustCoach,
  isTrustSafetyEnabled,
} from "@/lib/trust-safety";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Центр роста продавца",
};

export default async function AccountAiCenterPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_AI_CENTER);
  const data = isAiExperienceEnabled()
    ? await getSellerAiCenterDashboard(seller.sellerProfileId)
    : {
        enabled: false,
        title: "Центр роста продавца",
        growthLevel: null,
        happeningSummary: "AI_EXPERIENCE_ENABLED=false",
        priority: null,
        opportunities: [],
        insightCards: [],
      };
  const trustCoach = isTrustSafetyEnabled()
    ? await getSellerTrustCoach(seller.sellerProfileId)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {data.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Единый AI-опыт: Growth, Education, Promotion, Execution — без новых
          алгоритмов, только объединённое представление.
        </p>
      </div>
      <SellerAiCenterPanel data={data} />
      {trustCoach ? (
        <SellerTrustCoachPanel
          coach={trustCoach}
          route={ROUTES.ACCOUNT_AI_CENTER}
        />
      ) : null}
    </div>
  );
}
