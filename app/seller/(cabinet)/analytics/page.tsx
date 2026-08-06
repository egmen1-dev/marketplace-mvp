import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSellerSession } from "@/features/auth";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Аналитика",
};

export default async function SellerAnalyticsPage() {
  await requireSellerSession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Аналитика
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Расширенные отчёты появятся позже. Сейчас сводка на главной.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" aria-hidden />
            Скоро
          </CardTitle>
          <CardDescription>
            Динамика продаж, конверсия и топ товаров.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            nativeButton={false}
            render={<Link href={`${ROUTES.SELLER_DASHBOARD}#sales-chart`} />}
          >
            Открыть график на главной
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
