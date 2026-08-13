import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminFinancePanel } from "@/features/admin/components/admin-finance-panel";
import { getAdminFinanceDashboard } from "@/lib/finance";

export const metadata = {
  title: "Finance",
};

export default async function AdminFinancePage() {
  let data: Awaited<ReturnType<typeof getAdminFinanceDashboard>> | null = null;
  let dbError: string | null = null;

  try {
    data = await getAdminFinanceDashboard();
  } catch (err) {
    console.error("[admin/finance]", err);
    dbError = "Не удалось загрузить финансовую панель";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Finance dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          MVP оборот, комиссия, pending-транзакции и споры — без реальных
          выплат.
        </p>
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : data ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Foundation layer</CardDescription>
              <CardTitle className="font-heading text-lg">
                Marketplace transaction ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Деньги не переходят напрямую покупатель → продавец. Оплата → hold →
              release после COMPLETED.
            </CardContent>
          </Card>
          <AdminFinancePanel data={data} />
        </>
      ) : null}
    </div>
  );
}
