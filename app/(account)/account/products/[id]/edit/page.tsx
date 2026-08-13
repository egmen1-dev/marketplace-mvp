import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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
import {
  getOwnedProduct,
  ProductServiceError,
} from "@/features/products/queries";
import { ProductForm, ProductQualityCard } from "@/features/seller";
import { ProductModerationPreview } from "@/features/marketplace-trust-loop";
import {
  getProductModerationPreview,
  isMarketplaceTrustLoopEnabled,
} from "@/lib/marketplace-trust-loop";
import { computeProductCompletenessScore } from "@/lib/conversion";
import { ROUTES, sellerProductEditPath } from "@/lib/constants";

export const dynamic = "force-dynamic";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditProductPageProps) {
  const { id } = await params;
  return { title: `Редактирование · ${id.slice(0, 8)}` };
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = await params;

  const seller = await requireSellerCabinetAccess(sellerProductEditPath(id));
  const sellerProfileId = seller.sellerProfileId;

  let product: Awaited<ReturnType<typeof getOwnedProduct>>;
  try {
    product = await getOwnedProduct(id, sellerProfileId);
  } catch (err) {
    if (err instanceof ProductServiceError) {
      if (err.status === 404) notFound();
      if (err.status === 403) {
        redirect(ROUTES.SELLER_PRODUCTS);
      }
    }
    throw err;
  }

  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let pickupPoints: Awaited<ReturnType<typeof listSellerPickupPoints>> = [];
  let moderationPreview: Awaited<ReturnType<typeof getProductModerationPreview>> = null;
  try {
    [categories, pickupPoints, moderationPreview] = await Promise.all([
      listCategories(),
      listSellerPickupPoints(sellerProfileId, { activeOnly: true }),
      isMarketplaceTrustLoopEnabled()
        ? getProductModerationPreview(id)
        : Promise.resolve(null),
    ]);
  } catch (err) {
    console.error("[seller/products/edit]", err);
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
          Редактирование
        </h1>
        <p className="text-sm text-muted-foreground">{product.title}</p>
      </div>

      <ProductQualityCard
        result={computeProductCompletenessScore({
          photoCount: product.images.length,
          titleLength: product.title.trim().length,
          descriptionLength: (product.description ?? "").trim().length,
          characteristicCount: product.characteristics.length,
          hasCategory: Boolean(product.category?.id),
          hasProductType: Boolean(product.productType?.id),
          price: product.price,
          hasSeller: true,
        })}
      />

      {moderationPreview ? (
        <ProductModerationPreview
          qualityScore={moderationPreview.qualityScore}
          issues={moderationPreview.issues}
          aiAdvice={moderationPreview.aiAdvice}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Данные товара</CardTitle>
          <CardDescription>
            Изменения сохранятся сразу. Активные товары видны в каталоге.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            categories={categories}
            mode="edit"
            product={product}
            uploadPathPrefix={`products/${sellerProfileId.replace(/[^a-zA-Z0-9_-]/g, "")}/`}
            sellerPickupPoints={pickupPoints}
          />
        </CardContent>
      </Card>
    </div>
  );
}
