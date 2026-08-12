import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getConversionDashboard } from "@/lib/conversion";
import { ROUTES } from "@/lib/constants";
import { formatDateMoscowShort } from "@/lib/format/datetime";

export const metadata = {
  title: "Conversion",
};

export const dynamic = "force-dynamic";

function pct(n: number | null) {
  return n == null ? "—" : `${n}%`;
}

export default async function AdminConversionPage() {
  let data: Awaited<ReturnType<typeof getConversionDashboard>> | null = null;
  let dbError: string | null = null;

  try {
    data = await getConversionDashboard(7);
  } catch (err) {
    console.error("[admin/conversion]", err);
    dbError = "Не удалось загрузить conversion dashboard";
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-conversion">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Conversion
        </h2>
        <p className="text-sm text-muted-foreground">
          PDP → cart → checkout. Quality score не влияет на ranking. Окно{" "}
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>PDP views</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {data.pdpViews}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Add to cart rate</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {pct(data.addToCartRate)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {data.addToCart} add_to_cart
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Checkout rate</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {pct(data.checkoutRate)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {data.checkoutStarts} checkout_start
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Purchases</CardDescription>
                <CardTitle className="font-heading text-2xl tabular-nums">
                  {data.purchases}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Низкая конверсия PDP → cart</CardTitle>
              <CardDescription>
                ≥3 просмотра и view→cart &lt; 10%
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.lowConverters.length === 0 ? (
                <p className="text-sm text-muted-foreground">Пока нет данных</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Товар</th>
                      <th className="pb-2 pr-3 font-medium">Views</th>
                      <th className="pb-2 pr-3 font-medium">Cart</th>
                      <th className="pb-2 font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.lowConverters.map((row) => (
                      <tr key={row.productId}>
                        <td className="py-2 pr-3">
                          <Link
                            href={`${ROUTES.PRODUCT}/${row.productId}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {row.title}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{row.views}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {row.addToCart}
                        </td>
                        <td className="py-2 tabular-nums">
                          {pct(row.viewToCartRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Без фото</CardTitle>
                <CardDescription>ACTIVE без изображений</CardDescription>
              </CardHeader>
              <CardContent>
                {data.noPhoto.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет таких</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.noPhoto.map((p) => (
                      <li key={p.id} className="flex justify-between gap-3">
                        <Link
                          href={`${ROUTES.PRODUCT}/${p.id}`}
                          className="truncate text-primary underline-offset-4 hover:underline"
                        >
                          {p.title}
                        </Link>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {p.score}/100
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Низкий quality score</CardTitle>
                <CardDescription>&lt; 70 / 100</CardDescription>
              </CardHeader>
              <CardContent>
                {data.lowQuality.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет таких</p>
                ) : (
                  <ul className="space-y-2 text-sm" data-testid="admin-low-quality">
                    {data.lowQuality.map((p) => (
                      <li key={p.id} className="flex justify-between gap-3">
                        <Link
                          href={`${ROUTES.PRODUCT}/${p.id}`}
                          className="truncate text-primary underline-offset-4 hover:underline"
                        >
                          {p.title}
                        </Link>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {p.score}/100
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
