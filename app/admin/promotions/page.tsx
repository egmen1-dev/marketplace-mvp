import { Suspense } from "react";

import { AdminPromotionsPanel } from "@/features/admin/components/admin-promotions-panel";
import { AdminPromotionControlPanel } from "@/features/seller-promotion-center";
import {
  isPromotionAnalyticsEnabled,
  listAdminPromotionCampaigns,
  type AdminPromotionFilter,
} from "@/lib/promotion";
import {
  getAdminPromotionControlExtension,
  isSellerPromotionCenterEnabled,
} from "@/lib/seller-promotion-center";

export const metadata = {
  title: "Promotions",
};

type AdminPromotionsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

function parseFilter(raw?: string): AdminPromotionFilter {
  if (raw === "STARTED" || raw === "PAUSED" || raw === "ENDED") return raw;
  return "ALL";
}

export default async function AdminPromotionsPage({
  searchParams,
}: AdminPromotionsPageProps) {
  const { status: statusRaw } = await searchParams;
  const statusFilter = parseFilter(statusRaw);

  let data: Awaited<ReturnType<typeof listAdminPromotionCampaigns>> | null =
    null;
  let dbError: string | null = null;
  const promotionControl = isSellerPromotionCenterEnabled()
    ? await getAdminPromotionControlExtension()
    : { enabled: false, adSpendTotal: 0, platformRevenue: 0, activeSellers: 0, topCategories: [], sellerRows: [] };

  try {
    data = await listAdminPromotionCampaigns({ status: statusFilter });
  } catch (err) {
    console.error("[admin/promotions]", err);
    dbError = "Не удалось загрузить кампании продвижения";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Promotions
        </h2>
        <p className="text-sm text-muted-foreground">
          Кампании, размещения и приоритеты — distribution engine без биллинга.
        </p>
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : data ? (
        <Suspense fallback={null}>
          <AdminPromotionControlPanel data={promotionControl} />
          <AdminPromotionsPanel
            rows={data.rows}
            counts={data.counts}
            activeFilter={statusFilter}
            analytics={data.analytics}
            analyticsRows={data.analyticsRows}
            analyticsEnabled={isPromotionAnalyticsEnabled()}
            billing={data.billing}
            intelligence={data.intelligence}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
