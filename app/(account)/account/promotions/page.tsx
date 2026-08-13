import { requireSellerCabinetAccess } from "@/features/auth";
import {
  PromotionViewTracker,
  SellerPromotionsPanel,
} from "@/features/promotion";
import {
  isPromotionBillingEnabled,
  isPromotionSurfacesEnabled,
  isPromotionAnalyticsEnabled,
  listActivePromotionPlans,
  listSellerPromotionRows,
} from "@/lib/promotion";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Продвижение товаров",
};

export default async function AccountPromotionsPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_PROMOTIONS);
  let rows: Awaited<ReturnType<typeof listSellerPromotionRows>> = [];
  let dbError: string | null = null;

  try {
    rows = await listSellerPromotionRows(seller.sellerProfileId);
  } catch (err) {
    console.error("[account/promotions]", err);
    dbError = "Не удалось загрузить список товаров";
  }

  const billingEnabled = isPromotionBillingEnabled();
  const plans = billingEnabled ? await listActivePromotionPlans() : [];

  return (
    <div className="flex flex-col gap-6">
      <PromotionViewTracker />
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Продвижение товаров
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Включите продвижение для готовых карточек. Это MVP-механика — не
          рекламная биржа. Статус «Продвигаемый» виден покупателям на карточке
          товара.
        </p>
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : (
        <SellerPromotionsPanel
          rows={rows}
          surfacesEnabled={isPromotionSurfacesEnabled()}
          analyticsEnabled={isPromotionAnalyticsEnabled()}
          billingEnabled={billingEnabled}
          plans={plans}
        />
      )}
    </div>
  );
}
