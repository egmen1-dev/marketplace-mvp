import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  requireSellerCabinetAccess,
} from "@/features/auth";
import { listCategories } from "@/features/catalog";
import { listSellerPickupPoints } from "@/features/pickup/queries";
import { ProductForm } from "@/features/seller";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Новый товар",
};

export default async function NewProductPage() {
  const seller = await requireSellerCabinetAccess(ROUTES.SELLER_NEW_PRODUCT);
  const uploadPathPrefix = `products/${seller.sellerProfileId.replace(/[^a-zA-Z0-9_-]/g, "")}/`;

  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let pickupPoints: Awaited<ReturnType<typeof listSellerPickupPoints>> = [];
  let dbError: string | null = null;

  try {
    [categories, pickupPoints] = await Promise.all([
      listCategories(),
      listSellerPickupPoints(seller.sellerProfileId, { activeOnly: true }),
    ]);
  } catch (err) {
    console.error("[seller/products/new]", err);
    dbError = "Не удалось загрузить категории. Попробуйте обновить страницу позже.";
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-muted-foreground"
          nativeButton={false}
          render={<Link href={ROUTES.SELLER_PRODUCTS} />}
        >
          ← Мои товары
        </Button>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Новый товар
        </h1>
        <p className="text-sm text-muted-foreground">
          Укажите цену в рублях. После публикации товар сразу появится в каталоге.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Данные товара</CardTitle>
          <CardDescription>
            Товар будет привязан к вашему магазину.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dbError ? (
            <p className="text-sm text-destructive">{dbError}</p>
          ) : (
            <ProductForm
              categories={categories}
              mode="create"
              uploadPathPrefix={uploadPathPrefix}
              sellerPickupPoints={pickupPoints}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
