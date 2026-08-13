import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminFinanceDashboard } from "@/features/finance";
import { formatPrice } from "@/features/products/mappers";
import { formatDateMoscowShort } from "@/lib/format/datetime";

export const metadata = {
  title: "Finance",
};

export const dynamic = "force-dynamic";

export default async function AdminFinancePage() {
  let data: Awaited<ReturnType<typeof getAdminFinanceDashboard>> | null = null;
  let dbError: string | null = null;

  try {
    data = await getAdminFinanceDashboard();
  } catch (err) {
    console.error("[admin/finance]", err);
    dbError = "Не удалось загрузить finance dashboard";
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-finance">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Finance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Успешные оплаты, комиссия платформы и средства продавцов.
        </p>
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Успешные оплаты</CardDescription>
                <CardTitle className="font-heading text-2xl">
                  {data.successfulPayments}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Объём {formatPrice(data.paymentsVolume)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Комиссия (revenue)</CardDescription>
                <CardTitle className="font-heading text-2xl">
                  {formatPrice(data.commissionRevenue)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                10% с суммы товаров продавца
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending продавцов</CardDescription>
                <CardTitle className="font-heading text-2xl">
                  {formatPrice(data.pendingSellerFunds)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Available {formatPrice(data.availableSellerFunds)}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Последние SALE</CardTitle>
              <CardDescription>
                Начисления после webhook оплаты
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentSales.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Пока нет finance-транзакций.
                </p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {data.recentSales.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{row.storeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateMoscowShort(row.createdAt)} ·{" "}
                          {row.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p>
                          продавец {formatPrice(row.sellerAmount)} · комиссия{" "}
                          {formatPrice(row.commissionAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          брутто {formatPrice(row.grossAmount)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
