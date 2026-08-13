import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerOperatingDeskPanel } from "@/features/seller-operating-desk";
import { listSellerDashboardActivity } from "@/features/seller/queries";
import { ROUTES } from "@/lib/constants";
import {
  getSellerOperatingDeskDashboard,
  getSellerOperatingDeskRecentOrders,
  isSellerOperatingDeskEnabled,
} from "@/lib/seller-operating-desk";
import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Мой бизнес",
};

export default async function AccountBusinessPage() {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_BUSINESS);

  const [data, recentOrders, activity] = await Promise.all([
    isSellerOperatingDeskEnabled()
      ? getSellerOperatingDeskDashboard(seller.sellerProfileId)
      : Promise.resolve({
          enabled: false as const,
          now: {
            headline: "SELLER_OPERATING_DESK_ENABLED=false",
            summary: "",
            stats: {
              totalProducts: 0,
              activeProducts: 0,
              salesCount: 0,
              ordersCount: 0,
              revenue: 0,
              viewsSum: 0,
              favoritesSum: 0,
              lowStockCount: 0,
            },
            orderCounters: {
              newCount: 0,
              inProgress: 0,
              awaitingShipment: 0,
              readyForPickup: 0,
              overdue: 0,
            },
          },
          issues: [],
          todayActions: [],
          money: {
            pendingAmount: 0,
            availableAmount: 0,
            paidAmount: 0,
            headline: "",
            explanation: "",
            ctaLabel: "",
            ctaHref: ROUTES.ACCOUNT,
          },
          coach: null,
        }),
    getSellerOperatingDeskRecentOrders(seller.sellerProfileId),
    listSellerDashboardActivity(seller.sellerProfileId, 6),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Мой бизнес
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Единое рабочее место: продажи, проблемы, задачи на сегодня и деньги в
          одном экране.
        </p>
      </div>
      <SellerOperatingDeskPanel
        data={data}
        recentOrders={recentOrders.items}
        activity={activity}
      />
    </div>
  );
}
