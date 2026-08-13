import { AdminPromotionsPanel } from "@/features/admin/components/admin-promotions-panel";
import { listAdminPromotionCampaigns } from "@/lib/promotion";

export const metadata = {
  title: "Promotions",
};

export default async function AdminPromotionsPage() {
  let data: Awaited<ReturnType<typeof listAdminPromotionCampaigns>> | null =
    null;
  let dbError: string | null = null;

  try {
    data = await listAdminPromotionCampaigns();
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
          Активные кампании продвижения продавцов (MVP — без биллинга и аукциона).
        </p>
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : data ? (
        <AdminPromotionsPanel rows={data.rows} counts={data.counts} />
      ) : null}
    </div>
  );
}
