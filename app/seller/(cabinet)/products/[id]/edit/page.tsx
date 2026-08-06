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
  AuthRequiredError,
  requireSellerSession,
  SellerRequiredError,
} from "@/features/auth";
import { listCategories } from "@/features/catalog";
import {
  getOwnedProduct,
  ProductServiceError,
} from "@/features/products/queries";
import { ProductForm } from "@/features/seller";
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

  let sellerProfileId: string;
  try {
    const seller = await requireSellerSession();
    sellerProfileId = seller.sellerProfileId;
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      redirect(
        `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(sellerProductEditPath(id))}`,
      );
    }
    if (err instanceof SellerRequiredError) {
      redirect(ROUTES.HOME);
    }
    throw err;
  }

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
  try {
    categories = await listCategories();
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
