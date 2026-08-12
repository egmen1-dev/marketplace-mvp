import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAnalyticsMeasurementDashboard } from "@/features/admin/queries";
import { formatPct } from "@/lib/analytics/funnel-metrics";
import { formatDateMoscowShort } from "@/lib/format/datetime";

export const metadata = {
  title: "Analytics",
};

export default async function AdminAnalyticsPage() {
  let data: Awaited<ReturnType<typeof getAnalyticsMeasurementDashboard>> | null =
    null;
  let dbError: string | null = null;

  try {
    data = await getAnalyticsMeasurementDashboard(7);
  } catch (err) {
    console.error("[admin/analytics]", err);
    dbError = "Не удалось загрузить аналитику";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Ads measurement baseline
        </h2>
        <p className="text-sm text-muted-foreground">
          Funnel, product performance и UTM — без PII, последние{" "}
          {data?.windowDays ?? 7} дней.
        </p>
        {data ? (
          <p className="mt-1 text-xs text-muted-foreground">
            С {formatDateMoscowShort(data.since)}
          </p>
        ) : null}
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Visitors</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {data.overview.visitors}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Products viewed</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {data.overview.productsViewed}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Cart additions</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {data.overview.cartAdditions}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Checkout starts</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {data.overview.checkoutStarts}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Purchases</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {data.overview.purchases}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Funnel dashboard</CardTitle>
              <CardDescription>
                Traffic → Landing → Catalog → Product → Cart → Checkout →
                Purchase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Step</th>
                      <th className="pb-2 pr-4 font-medium tabular-nums">Count</th>
                      <th className="pb-2 pr-4 font-medium tabular-nums">
                        Unique visitors
                      </th>
                      <th className="pb-2 pr-4 font-medium tabular-nums">
                        Conv. prev
                      </th>
                      <th className="pb-2 pr-4 font-medium tabular-nums">
                        Conv. traffic
                      </th>
                      <th className="pb-2 font-medium tabular-nums">Drop-off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.funnelSteps.map((step) => (
                      <tr
                        key={step.event}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium">{step.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {step.event}
                          </p>
                        </td>
                        <td className="py-3 pr-4 tabular-nums">{step.count}</td>
                        <td className="py-3 pr-4 tabular-nums">
                          {step.uniqueVisitors}
                        </td>
                        <td className="py-3 pr-4 tabular-nums">
                          {formatPct(step.conversionFromPrevious)}
                        </td>
                        <td className="py-3 pr-4 tabular-nums">
                          {formatPct(step.conversionFromTraffic)}
                        </td>
                        <td className="py-3 tabular-nums">
                          {step.dropOff ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Product analytics</CardTitle>
                <CardDescription>
                  Most viewed · add-to-cart rate (views → cart)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.popularByViews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Нет product_view событий за период.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.popularByViews.map((row) => (
                      <li
                        key={row.productId}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.views} views · {row.addToCart} in cart
                          </p>
                        </div>
                        <p className="shrink-0 text-sm tabular-nums text-primary">
                          {formatPct(row.viewToCartRate)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>UTM sources</CardTitle>
                <CardDescription>First-touch attribution (cookie)</CardDescription>
              </CardHeader>
              <CardContent>
                {data.utmSources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    UTM пока не зафиксированы. Используйте{" "}
                    <code className="text-xs">?utm_source=…</code> в ссылках
                    рекламы.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.utmSources.map((row) => (
                      <li
                        key={row.source}
                        className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="font-medium">{row.source}</span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {row.visitors} visitors · {row.events} events
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Engagement events</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["landing_view", "Landing view"],
                  ["product_view", "Product view"],
                  ["add_to_cart", "Add to cart"],
                  ["checkout_start", "Checkout start"],
                  ["purchase_complete", "Purchase"],
                  ["cta_click", "CTA click"],
                  ["trust_block_view", "Trust block view"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="rounded-xl border border-border px-4 py-3"
                >
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-heading text-xl tabular-nums">
                    {data.counts[key] ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    uniq {data.uniqueByEvent[key] ?? 0}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
