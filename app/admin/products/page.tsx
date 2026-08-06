import Link from "next/link";
import { ProductStatus } from "@prisma/client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminProductsTable, listAdminProducts } from "@/features/admin";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Товары",
};

const FILTERS: Array<{ label: string; value: string }> = [
  { label: "Все", value: "ALL" },
  { label: "ACTIVE", value: ProductStatus.ACTIVE },
  { label: "DRAFT", value: ProductStatus.DRAFT },
  { label: "ARCHIVED", value: ProductStatus.ARCHIVED },
];

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const { status: raw } = await searchParams;
  const statusFilter =
    raw && FILTERS.some((f) => f.value === raw)
      ? (raw as ProductStatus | "ALL")
      : "ALL";

  const products = await listAdminProducts({ status: statusFilter });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Товары
        </h2>
        <p className="text-sm text-muted-foreground">
          Модерация · найдено: {products.length}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = statusFilter === f.value;
          const href =
            f.value === "ALL"
              ? ROUTES.ADMIN_PRODUCTS
              : `${ROUTES.ADMIN_PRODUCTS}?status=${f.value}`;
          return (
            <Link
              key={f.value}
              href={href}
              className={
                active
                  ? "rounded-lg bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary"
                  : "rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Каталог</CardTitle>
          <CardDescription>
            Удаление с заказами → архив (история сохраняется)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminProductsTable products={products} />
        </CardContent>
      </Card>
    </div>
  );
}
