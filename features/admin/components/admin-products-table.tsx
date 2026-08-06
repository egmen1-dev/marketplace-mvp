"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  deleteAdminProductAction,
  setProductStatusAction,
} from "@/features/admin/actions";
import type { AdminProductRow } from "@/features/admin/queries";
import { formatPrice } from "@/features/products/mappers";
import { ProductStatusBadge } from "@/features/seller/components/product-status-badge";
import { ROUTES } from "@/lib/constants";

export function AdminProductsTable({
  products,
}: {
  products: AdminProductRow[];
}) {
  if (products.length === 0) {
    return (
      <p className="py-8 text-sm text-muted-foreground">Товаров не найдено.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-2 py-2 font-medium">Фото</th>
            <th className="px-2 py-2 font-medium">Название</th>
            <th className="px-2 py-2 font-medium">Продавец</th>
            <th className="px-2 py-2 font-medium">Категория</th>
            <th className="px-2 py-2 font-medium">Цена</th>
            <th className="px-2 py-2 font-medium">Статус</th>
            <th className="px-2 py-2 font-medium">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {products.map((product) => (
            <tr key={product.id}>
              <td className="px-2 py-3">
                <div className="relative size-12 overflow-hidden rounded-lg bg-muted">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : null}
                </div>
              </td>
              <td className="px-2 py-3">
                <Link
                  href={`${ROUTES.PRODUCT}/${product.slug}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {product.name}
                </Link>
              </td>
              <td className="px-2 py-3 text-muted-foreground">
                {product.storeName}
              </td>
              <td className="px-2 py-3 text-muted-foreground">
                {product.categoryName || "—"}
              </td>
              <td className="px-2 py-3 tabular-nums">
                {formatPrice(product.price)}
              </td>
              <td className="px-2 py-3">
                <ProductStatusBadge status={product.status} />
              </td>
              <td className="px-2 py-3">
                <ProductActions product={product} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductActions({ product }: { product: AdminProductRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    fn: () => Promise<{ ok: boolean; error?: string; message?: string }>,
  ) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {product.status !== ProductStatus.ACTIVE ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              setProductStatusAction(product.id, ProductStatus.ACTIVE),
            )
          }
        >
          Активировать
        </Button>
      ) : null}
      {product.status !== ProductStatus.ARCHIVED ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              setProductStatusAction(product.id, ProductStatus.ARCHIVED),
            )
          }
        >
          Скрыть
        </Button>
      ) : null}
      <DeleteProductAdminButton product={product} />
    </div>
  );
}

function DeleteProductAdminButton({ product }: { product: AdminProductRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deleteAdminProductAction(product.id);
      if (!result.ok) {
        setError(result.error ?? "Ошибка");
        return;
      }
      setMessage(result.message ?? null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
          />
        }
      >
        Удалить
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Удалить товар?</DialogTitle>
          <DialogDescription>
            «{product.name}».
            {product.orderItemCount > 0
              ? " Товар есть в заказах — будет архивирован, история заказов сохранится."
              : " Удаление безвозвратное."}
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            Отмена
          </DialogClose>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? "…" : "Подтвердить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
