"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { ProductCondition, ProductStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryListItem } from "@/features/catalog/queries";
import { PRODUCT_CONDITION_LABELS } from "@/features/products/mappers";
import type { ProductDetail } from "@/features/products/types";
import {
  createProductAction,
  updateProductAction,
  type ProductActionState,
} from "@/features/seller/actions";
import { CategoryPicker } from "@/features/seller/components/category-picker";
import { ProductImageUploader } from "@/features/seller/components/product-image-uploader";
import { isLowStock } from "@/features/orders/lib/inventory-sync";
import { toastError } from "@/lib/toasts";

const initialState: ProductActionState = { ok: false };

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: ProductStatus.ACTIVE, label: "Активный" },
  { value: ProductStatus.DRAFT, label: "Черновик" },
  { value: ProductStatus.ARCHIVED, label: "В архиве" },
  { value: ProductStatus.OUT_OF_STOCK, label: "Нет в наличии" },
];

const CONDITION_OPTIONS = Object.values(ProductCondition);

type ProductFormProps = {
  categories: CategoryListItem[];
  mode: "create" | "edit";
  product?: ProductDetail;
  /** `products/{sellerProfileId}/` for client-direct Blob uploads */
  uploadPathPrefix: string;
};

export function ProductForm({
  categories,
  mode,
  product,
  uploadPathPrefix,
}: ProductFormProps) {
  const [categoryId, setCategoryId] = useState(
    product?.category?.id ?? "",
  );

  const boundUpdate = useMemo(
    () =>
      mode === "edit" && product
        ? updateProductAction.bind(null, product.id)
        : null,
    [mode, product],
  );

  const [state, formAction, pending] = useActionState(
    boundUpdate ?? createProductAction,
    initialState,
  );
  const toastedError = useRef<string | null>(null);

  useEffect(() => {
    if (state.error && state.error !== toastedError.current) {
      toastedError.current = state.error;
      toastError(state.error);
    }
    if (!state.error) toastedError.current = null;
  }, [state.error]);

  const initialImageUrls = useMemo(
    () => product?.images?.map((img) => img.url) ?? [],
    [product],
  );

  const stockDefault = product?.stock ?? 10;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {mode === "create" ? (
        <input type="hidden" name="status" value="ACTIVE" />
      ) : null}
      <input type="hidden" name="categoryId" value={categoryId} />

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold">Основное</h2>
        <ProductImageUploader
          initialUrls={initialImageUrls}
          error={state.fieldErrors?.images?.[0]}
          disabled={pending}
          pathPrefix={uploadPathPrefix}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="title">Название</Label>
          <Input
            id="title"
            name="title"
            required
            placeholder="Беспроводные наушники Pulse"
            defaultValue={product?.title}
            aria-invalid={Boolean(state.fieldErrors?.title)}
          />
          {state.fieldErrors?.title?.[0] ? (
            <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Описание</Label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            placeholder="Кратко расскажите о товаре…"
            className="rounded-xl bg-surface"
            defaultValue={product?.description ?? ""}
          />
        </div>

        <CategoryPicker
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
          disabled={pending}
          error={state.fieldErrors?.categoryId?.[0]}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="price">Цена, ₽</Label>
            <Input
              id="price"
              name="price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              placeholder="4990"
              defaultValue={product?.price}
              aria-invalid={Boolean(state.fieldErrors?.price)}
            />
            {state.fieldErrors?.price?.[0] ? (
              <p className="text-xs text-destructive">
                {state.fieldErrors.price[0]}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="stock">Количество на складе</Label>
            <Input
              id="stock"
              name="stock"
              type="number"
              min="0"
              step="1"
              defaultValue={stockDefault}
              aria-invalid={Boolean(state.fieldErrors?.stock)}
            />
            {isLowStock(stockDefault) ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Низкий остаток — пополните склад
              </p>
            ) : null}
            {state.fieldErrors?.stock?.[0] ? (
              <p className="text-xs text-destructive">
                {state.fieldErrors.stock[0]}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="city">Город</Label>
            <Input
              id="city"
              name="city"
              placeholder="Москва"
              defaultValue={product?.city ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="condition">Состояние</Label>
            <select
              id="condition"
              name="condition"
              className="h-10 w-full rounded-xl border border-input bg-surface px-3.5 text-sm text-foreground outline-none focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/25"
              defaultValue={product?.condition ?? ProductCondition.NEW}
            >
              {CONDITION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {PRODUCT_CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mode === "edit" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="status">Статус</Label>
            <select
              id="status"
              name="status"
              className="h-10 w-full rounded-xl border border-input bg-surface px-3.5 text-sm text-foreground outline-none focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/25"
              defaultValue={product?.status ?? ProductStatus.ACTIVE}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6">
        <h2 className="font-heading text-lg font-semibold">Дополнительно</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sku">Артикул (SKU)</Label>
            <Input
              id="sku"
              name="sku"
              defaultValue={product?.sku ?? ""}
              placeholder="LOT-001"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="weight">Вес, кг</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              step="0.001"
              min="0"
              defaultValue={product?.weight ?? ""}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lengthCm">Длина, см</Label>
            <Input
              id="lengthCm"
              name="lengthCm"
              type="number"
              step="0.1"
              min="0"
              defaultValue={product?.lengthCm ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="widthCm">Ширина, см</Label>
            <Input
              id="widthCm"
              name="widthCm"
              type="number"
              step="0.1"
              min="0"
              defaultValue={product?.widthCm ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="heightCm">Высота, см</Label>
            <Input
              id="heightCm"
              name="heightCm"
              type="number"
              step="0.1"
              min="0"
              defaultValue={product?.heightCm ?? ""}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-6">
        <h2 className="font-heading text-lg font-semibold">SEO</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="seoTitle">SEO-заголовок</Label>
          <Input
            id="seoTitle"
            name="seoTitle"
            maxLength={120}
            defaultValue={product?.seoTitle ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="seoDescription">SEO-описание</Label>
          <Textarea
            id="seoDescription"
            name="seoDescription"
            rows={3}
            maxLength={320}
            className="rounded-xl bg-surface"
            defaultValue={product?.seoDescription ?? ""}
          />
        </div>
      </section>

      {state.error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending
          ? "Сохраняем…"
          : mode === "edit"
            ? "Сохранить изменения"
            : "Опубликовать товар"}
      </Button>
    </form>
  );
}

/** @deprecated Use ProductForm */
export function ProductCreateForm({
  categories,
  uploadPathPrefix,
}: {
  categories: CategoryListItem[];
  uploadPathPrefix: string;
}) {
  return (
    <ProductForm
      categories={categories}
      mode="create"
      uploadPathPrefix={uploadPathPrefix}
    />
  );
}
