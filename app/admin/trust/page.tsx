import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminDisputeResolveButtons } from "@/components/trust/admin-dispute-resolve-buttons";
import {
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_LABELS,
  getAdminTrustDashboard,
  isTrustSafetyEnabled,
} from "@/lib/trust-safety";
import { formatDateMoscowShort } from "@/lib/format/datetime";

export const metadata = {
  title: "Trust Center",
};

export const dynamic = "force-dynamic";

export default async function AdminTrustPage() {
  const enabled = isTrustSafetyEnabled();

  let data: Awaited<ReturnType<typeof getAdminTrustDashboard>> | null = null;
  let dbError: string | null = null;

  if (enabled) {
    try {
      data = await getAdminTrustDashboard();
    } catch (err) {
      console.error("[admin/trust]", err);
      dbError = "Не удалось загрузить Trust Center";
    }
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-trust">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Trust Center
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Споры, очередь разбора и сигналы риска продавцов.
        </p>
      </div>

      {!enabled ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
          Trust &amp; Safety выключен. Установите{" "}
          <code className="text-foreground">TRUST_SAFETY_ENABLED=true</code> на
          staging.
        </p>
      ) : null}

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active disputes</CardDescription>
                <CardTitle className="font-heading text-2xl">
                  {data.riskSignals.openDisputeCount}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Resolution queue</CardDescription>
                <CardTitle className="font-heading text-2xl">
                  {data.resolutionQueue.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sellers in overview</CardDescription>
                <CardTitle className="font-heading text-2xl">
                  {data.sellers.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Risk: new unverified</CardDescription>
                <CardTitle className="font-heading text-2xl">
                  {data.riskSignals.unverifiedNewSellers}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                За 30 дней без verification
              </CardContent>
            </Card>
          </div>

          <Card data-testid="admin-trust-disputes">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Active disputes
              </CardTitle>
              <CardDescription>Открытые и на проверке</CardDescription>
            </CardHeader>
            <CardContent>
              {data.activeDisputes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет активных споров</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.activeDisputes.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-sm">
                        <p className="font-medium">
                          {d.order.orderNumber} · {d.seller.storeName}
                        </p>
                        <p className="text-muted-foreground">
                          {DISPUTE_REASON_LABELS[d.reason]} ·{" "}
                          {DISPUTE_STATUS_LABELS[d.status]} ·{" "}
                          {formatDateMoscowShort(d.createdAt)}
                        </p>
                      </div>
                      <AdminDisputeResolveButtons disputeId={d.id} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card data-testid="admin-trust-sellers">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Seller trust overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border text-sm">
                {data.sellers.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span className="font-medium">{s.storeName}</span>
                    <span className="text-muted-foreground">
                      {s.isVerified ? "verified" : "unverified"} · споров{" "}
                      {s._count.disputes} · товаров {s._count.products}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card data-testid="admin-trust-risk">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Risk signals</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-inside list-disc space-y-1">
                <li>
                  Открытых споров: {data.riskSignals.openDisputeCount}
                </li>
                <li>
                  Новых непроверенных продавцов (30д):{" "}
                  {data.riskSignals.unverifiedNewSellers}
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
