import { AlertTriangle } from "lucide-react";

import { requireSellerCabinetAccess } from "@/features/auth";
import { listProducts } from "@/features/products/queries";
import {
  DashboardActivity,
  DashboardKpiCards,
  DashboardQuickActions,
  DashboardRecentOrders,
  DashboardRecentProducts,
} from "@/features/seller/components/dashboard";
import {
  getSellerDashboardStats,
  listSellerDashboardActivity,
  listSellerOrders,
} from "@/features/seller/queries";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Панель продавца",
};

export default async function SellerDashboardPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.SELLER_DASHBOARD);

  let stats = {
    totalProducts: 0,
    activeProducts: 0,
    salesCount: 0,
    ordersCount: 0,
    revenue: 0,
    viewsSum: 0,
    favoritesSum: 0,
    lowStockCount: 0,
  };
  let recent: Awaited<ReturnType<typeof listProducts>> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 5,
    totalPages: 1,
  };
  let recentOrders: Awaited<ReturnType<typeof listSellerOrders>> = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 5,
  };
  let activity: Awaited<ReturnType<typeof listSellerDashboardActivity>> = [];
  let dbError: string | null = null;

  try {
    const [dashboard, allRecent, orders, feed] = await Promise.all([
      getSellerDashboardStats(seller.sellerProfileId),
      listProducts({
        sellerId: seller.sellerProfileId,
        status: "ALL",
        pageSize: 5,
        sort: "newest",
      }),
      listSellerOrders(seller.sellerProfileId, { pageSize: 5 }),
      listSellerDashboardActivity(seller.sellerProfileId, 8),
    ]);
    stats = dashboard;
    recent = allRecent;
    recentOrders = orders;
    activity = feed;
  } catch (err) {
    console.error("[seller/dashboard]", err);
    dbError = "Не удалось загрузить дашборд";
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Панель продавца
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {seller.storeName}
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Управляйте товарами, заказами и продажами
          {seller.name ? ` · ${seller.name}` : ""}.
        </p>
      </header>

      {stats.lowStockCount > 0 ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
          role="status"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Низкий остаток у {stats.lowStockCount}{" "}
            {stats.lowStockCount === 1 ? "товара" : "товаров"}. Проверьте склад
            на странице товаров.
          </p>
        </div>
      ) : null}

      {dbError ? (
        <p className="text-sm text-destructive" role="alert">
          {dbError}
        </p>
      ) : (
        <>
          <DashboardKpiCards stats={stats} />
          <DashboardQuickActions />
          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardRecentOrders orders={recentOrders.items} />
            <DashboardRecentProducts products={recent.items} />
          </div>
          <DashboardActivity items={activity} />
        </>
      )}
    </div>
  );
}
