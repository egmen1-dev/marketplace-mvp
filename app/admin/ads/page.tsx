import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminAdsPanel } from "@/features/admin/components/admin-ads-panel";
import { getAdminAdsDashboard } from "@/features/admin/queries";
import { adEligibilityReasonLabel, type AdEligibilityReason } from "@/lib/product-advertising";

export const metadata = {
  title: "Ads readiness",
};

export default async function AdminAdsPage() {
  let data: Awaited<ReturnType<typeof getAdminAdsDashboard>> | null = null;
  let dbError: string | null = null;

  try {
    data = await getAdminAdsDashboard();
  } catch (err) {
    console.error("[admin/ads]", err);
    dbError = "Не удалось загрузить данные готовности к рекламе";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Ads readiness
        </h2>
        <p className="text-sm text-muted-foreground">
          Какие товары можно включать в рекламные кампании — без запуска ads.
        </p>
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : data ? (
        <>
          <Suspense fallback={null}>
            <AdminAdsPanel data={data} />
          </Suspense>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Category readiness
              </CardTitle>
              <CardDescription>
                Construction, Tools, Electronics, Clothing, Home
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-2 py-2">Category</th>
                      <th className="px-2 py-2">Products</th>
                      <th className="px-2 py-2">Ready</th>
                      <th className="px-2 py-2">Readiness</th>
                      <th className="px-2 py-2">Avg score</th>
                      <th className="px-2 py-2">Top problems</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.categories.map((cat) => (
                      <tr
                        key={cat.slug}
                        className="border-b border-border/60"
                        data-testid={`ads-category-${cat.slug}`}
                      >
                        <td className="px-2 py-2 font-medium">{cat.name}</td>
                        <td className="px-2 py-2 tabular-nums">
                          {cat.totalProducts}
                        </td>
                        <td className="px-2 py-2 tabular-nums">
                          {cat.readyCount}
                        </td>
                        <td className="px-2 py-2 tabular-nums">
                          {cat.readinessPct}%
                        </td>
                        <td className="px-2 py-2 tabular-nums">
                          {cat.avgQualityScore}
                        </td>
                        <td className="px-2 py-2 text-xs text-muted-foreground">
                          {cat.topProblems.length > 0
                            ? cat.topProblems
                                .map((r) =>
                                  adEligibilityReasonLabel(r as AdEligibilityReason),
                                )
                                .join(", ")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
