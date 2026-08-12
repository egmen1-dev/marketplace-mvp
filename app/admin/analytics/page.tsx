import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAnalyticsFunnelCounts } from "@/features/admin/queries";
import { FUNNEL_STEPS } from "@/lib/analytics/events";
import { formatDateMoscowShort } from "@/lib/format/datetime";

export const metadata = {
  title: "Analytics",
};

function pct(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export default async function AdminAnalyticsPage() {
  let funnel: Awaited<ReturnType<typeof getAnalyticsFunnelCounts>> | null =
    null;
  let dbError: string | null = null;

  try {
    funnel = await getAnalyticsFunnelCounts(7);
  } catch (err) {
    console.error("[admin/analytics]", err);
    dbError = "Не удалось загрузить аналитику";
  }

  const landing = funnel?.counts.landing_view ?? 0;
  const pageViews = funnel?.counts.page_view ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Conversion funnel
        </h2>
        <p className="text-sm text-muted-foreground">
          События без PII за последние {funnel?.windowDays ?? 7} дней. Источник:
          embedded WebView помечен отдельно.
        </p>
        {funnel ? (
          <p className="mt-1 text-xs text-muted-foreground">
            С {formatDateMoscowShort(funnel.since)} · всего событий{" "}
            {funnel.totalEvents}
          </p>
        ) : null}
      </div>

      {dbError ? (
        <p className="text-sm text-destructive">{dbError}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Landing views</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {landing}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Page views</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {pageViews}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>WebView events</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {Object.values(funnel?.webviewCounts ?? {}).reduce(
                    (a, b) => a + b,
                    0,
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Purchases</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {funnel?.counts.purchase_complete ?? 0}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Traffic funnel</CardTitle>
              <CardDescription>
                Traffic → Landing → Catalog → Product → Cart → Checkout → Order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3">
                {FUNNEL_STEPS.map((step, index) => {
                  const count = funnel?.counts[step.event] ?? 0;
                  const webview = funnel?.webviewCounts[step.event] ?? 0;
                  const prev =
                    index > 0
                      ? (funnel?.counts[FUNNEL_STEPS[index - 1]!.event] ?? 0)
                      : landing;
                  return (
                    <li
                      key={step.event}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{step.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.event}
                          {webview > 0
                            ? ` · WebView ${webview}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-xl tabular-nums">
                          {count}
                        </p>
                        {index > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            {pct(count, prev)} от prev
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search &amp; discovery</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border px-4 py-3">
                <p className="text-sm text-muted-foreground">search_used</p>
                <p className="font-heading text-2xl tabular-nums">
                  {funnel?.counts.search_used ?? 0}
                </p>
              </div>
              <div className="rounded-xl border px-4 py-3">
                <p className="text-sm text-muted-foreground">page_view (all)</p>
                <p className="font-heading text-2xl tabular-nums">
                  {pageViews}
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
