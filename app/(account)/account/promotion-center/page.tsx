import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerPromotionCenterPanel } from "@/features/seller-promotion-center";
import { ROUTES } from "@/lib/constants";
import {
  getSellerPromotionCenterDashboard,
  isSellerPromotionCenterEnabled,
} from "@/lib/seller-promotion-center";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Продвижение товаров",
};

export default async function AccountPromotionCenterPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_PROMOTION_CENTER);
  const data = isSellerPromotionCenterEnabled()
    ? await getSellerPromotionCenterDashboard(seller.sellerProfileId)
    : {
        enabled: false,
        title: "Продвижение товаров",
        summary: {
          periodLabel: "Продвижение за 30 дней",
          activeCampaigns: 0,
          spend: 0,
          impressions: 0,
          clicks: 0,
          orders: 0,
          revenue: 0,
          roiPercent: null,
          roiLabel: "SELLER_PROMOTION_CENTER_ENABLED=false",
        },
        opportunities: [],
        campaigns: [],
        budgetRecommendation: null,
        analytics: {
          funnel: [],
          metrics: {
            impressions: 0,
            clicks: 0,
            ctr: 0,
            conversionRate: 0,
            orders: 0,
            revenue: 0,
          },
        },
        aiAdvice: [],
        comparison: [],
        plans: [],
        rows: [],
        billingEnabled: false,
        intelligenceEnabled: false,
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {data.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Интеллектуальный центр продвижения — кампании, бюджет, аналитика и AI
          рекомендации без изменения ranking и payment flow.
        </p>
      </div>
      <SellerPromotionCenterPanel data={data} />
    </div>
  );
}
