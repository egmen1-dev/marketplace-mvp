import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSellerCabinetAccess } from "@/features/auth";
import { SellerSettingsForm } from "@/features/seller/components/seller-settings-form";
import { getSellerSettings } from "@/features/seller/queries";
import { ROUTES, sellerPublicPath } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Настройки магазина",
};

export default async function SellerSettingsPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.SELLER_SETTINGS);
  const settings = await getSellerSettings(seller.sellerProfileId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Настройки
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Публичная витрина:{" "}
          <Link
            href={sellerPublicPath(settings.slug)}
            className="text-primary underline-offset-4 hover:underline"
          >
            /seller/{settings.slug}
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Профиль магазина</CardTitle>
          <CardDescription>
            Эти данные видны покупателям на странице продавца.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SellerSettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
