import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerGrowthDashboardPanel } from "@/features/seller-growth";
import {
  getSellerGrowthDashboard,
  isSellerGrowthEnabled,
} from "@/lib/seller-growth";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Рост продаж",
};

export default async function AccountGrowthPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_GROWTH);

  if (!isSellerGrowthEnabled()) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Рост продаж
        </h1>
        <p className="text-sm text-muted-foreground">
          AI-рекомендации по росту скоро будут доступны на площадке.
        </p>
      </div>
    );
  }

  let data: Awaited<ReturnType<typeof getSellerGrowthDashboard>> = null;
  let dbError: string | null = null;

  try {
    data = await getSellerGrowthDashboard(seller.sellerProfileId);
  } catch (err) {
    console.error("[account/growth]", err);
    dbError = "Не удалось загрузить рекомендации";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Рост продаж
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          AI анализирует ваш магазин и подсказывает, что улучшить. Никаких
          автоматических изменений — только рекомендации.
        </p>
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : data ? (
        <SellerGrowthDashboardPanel data={data} />
      ) : (
        <p className="text-sm text-muted-foreground">Нет данных для анализа</p>
      )}
    </div>
  );
}
