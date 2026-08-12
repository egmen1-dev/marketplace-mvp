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
import { DynamicCharacteristicsFields } from "@/features/taxonomy/components/dynamic-characteristics-fields";
import {
  TaxonomySelector,
  type SelectedProductType,
} from "@/features/taxonomy/components/taxonomy-selector";
import type { CharacteristicDefinitionDto } from "@/features/taxonomy/queries";
import { isLowStock } from "@/features/orders/lib/inventory-sync";
import { PREPAYMENT_PERCENTS } from "@/features/pickup/lib/prepayment";
import type { PickupPointDto } from "@/features/pickup/queries";
import { toastError } from "@/lib/toasts";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";

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
  /** Seller warehouse points for pickup linking */
  sellerPickupPoints?: PickupPointDto[];
};

export function ProductForm({
  categories,
  mode,
  product,
  uploadPathPrefix,
  sellerPickupPoints = [],
}: ProductFormProps) {
  const [title, setTitle] = useState(product?.title ?? "");
  const [categoryId, setCategoryId] = useState(
    product?.category?.id ?? "",
  );
  const [productType, setProductType] = useState<SelectedProductType | null>(
    product?.productType
      ? {
          id: product.productType.id,
          name: product.productType.name,
          categoryId: product.productType.categoryId,
          breadcrumb: product.productType.breadcrumb ?? [
            product.productType.name,
          ],
        }
      : null,
  );
  const [charDefs, setCharDefs] = useState<CharacteristicDefinitionDto[]>([]);
  const [pickupEnabled, setPickupEnabled] = useState(
    product?.pickupEnabled ?? false,
  );
  const [reservationEnabled, setReservationEnabled] = useState(
    product?.reservationEnabled ?? false,
  );
  const [showLegacyCategory, setShowLegacyCategory] = useState(false);

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

  useEffect(() => {
    if (!productType?.id) {
      setCharDefs([]);
      return;
    }
    let cancelled = false;
    void fetch(
      `/api/taxonomy/browse?productTypeId=${encodeURIComponent(productType.id)}`,
    )
      .then((r) => r.json())
      .then(
        (d: {
          characteristics?: CharacteristicDefinitionDto[];
          categoryId?: string;
        }) => {
          if (cancelled) return;
          setCharDefs(d.characteristics ?? []);
          if (d.categoryId) setCategoryId(d.categoryId);
        },
      )
      .catch(() => {
        if (!cancelled) setCharDefs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [productType?.id]);

  const initialImageUrls = useMemo(
    () => product?.images?.map((img) => img.url) ?? [],
    [product],
  );

  const stockDefault = product?.stock ?? 10;

  const charDefaults = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of product?.characteristics ?? []) {
      map[v.definitionId] = v.formValue ?? v.displayValue;
    }
    return map;
  }, [product?.characteristics]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {mode === "create" ? (
        <input type="hidden" name="status" value="ACTIVE" />
      ) : null}
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="productTypeId" value={productType?.id ?? ""} />

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
            placeholder="Тепловая пушка Ballu 5 кВт"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.title)}
            autoComplete="off"
            // Browser autofill can rewrite before hydrate → intermittent #418
            suppressHydrationWarning
          />
          {state.fieldErrors?.title?.[0] ? (
            <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
          ) : null}
        </div>

        <TaxonomySelector
          productTitle={title}
          value={productType}
          onChange={(next) => {
            setProductType(next);
            if (next?.categoryId) setCategoryId(next.categoryId);
          }}
          disabled={pending}
          error={state.fieldErrors?.productTypeId?.[0]}
        />

        <DynamicCharacteristicsFields
          definitions={charDefs}
          defaults={charDefaults}
          disabled={pending}
        />

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

        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-0 text-xs text-muted-foreground"
            onClick={() => setShowLegacyCategory((v) => !v)}
          >
            {showLegacyCategory
              ? "Скрыть ручной выбор категории"
              : "Дополнительно: категория каталога"}
          </Button>
          {showLegacyCategory ? (
            <CategoryPicker
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              disabled={pending}
              error={state.fieldErrors?.categoryId?.[0]}
            />
          ) : null}
        </div>

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
              autoComplete="off"
              suppressHydrationWarning
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
              autoComplete="off"
              suppressHydrationWarning
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
              autoComplete="off"
              suppressHydrationWarning
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
        <h2 className="font-heading text-lg font-semibold">Получение товара</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="pickupEnabled"
            value="on"
            checked={pickupEnabled}
            onChange={(e) => {
              setPickupEnabled(e.target.checked);
              if (!e.target.checked) setReservationEnabled(false);
            }}
            className="size-4 rounded border-border"
          />
          Доступен самовывоз
        </label>

        {pickupEnabled ? (
          <div className="space-y-3 rounded-xl border border-border bg-surface/40 p-4">
            {sellerPickupPoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Сначала добавьте точку самовывоза.{" "}
                <Link
                  href={ROUTES.ACCOUNT_PICKUP_POINTS_NEW}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Добавить точку
                </Link>
              </p>
            ) : (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Точки самовывоза</legend>
                {sellerPickupPoints.map((p) => {
                  const checked =
                    product?.pickupPoints?.some((x) => x.id === p.id) ?? false;
                  return (
                    <label
                      key={p.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="pickupPointIds"
                        value={p.id}
                        defaultChecked={checked}
                        className="mt-0.5 size-4 rounded border-border"
                      />
                      <span>
                        <span className="font-medium">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.city}, {p.address}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="reservationEnabled"
                value="on"
                checked={reservationEnabled}
                onChange={(e) => setReservationEnabled(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Возможна бронь товара
            </label>

            {reservationEnabled ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="prepaymentPercent">Размер предоплаты (%)</Label>
                <select
                  id="prepaymentPercent"
                  name="prepaymentPercent"
                  className="h-10 w-full rounded-xl border border-input bg-surface px-3.5 text-sm"
                  defaultValue={String(product?.prepaymentPercent ?? 20)}
                >
                  {PREPAYMENT_PERCENTS.map((p) => (
                    <option key={p} value={p}>
                      {p}%
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
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
