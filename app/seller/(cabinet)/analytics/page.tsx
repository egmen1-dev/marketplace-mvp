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
import { requireSellerCabinetAccess } from "@/features/auth";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Аналитика",
};

export default async function SellerAnalyticsPage() {
  await requireSellerCabinetAccess(ROUTES.SELLER_ANALYTICS);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Аналитика
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Расширенные отчёты появятся позже. Актуальная сводка — на главной
          кабинета.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" aria-hidden />
            Сводка магазина
          </CardTitle>
          <CardDescription>
            Заказы, товары и активность доступны на дашборде продавца.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            nativeButton={false}
            render={<Link href={ROUTES.SELLER_DASHBOARD} />}
          >
            Открыть кабинет
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
