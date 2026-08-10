import { ProductCondition, ProductStatus } from "@prisma/client";
import { z } from "zod";

/**
 * Shared Zod schemas for product create / update / list query.
 * Used by API route handlers and Server Actions.
 */

const imageSchema = z.object({
  url: z.string().url("Некорректный URL изображения"),
  alt: z.string().max(200).optional().nullable(),
  pathname: z.string().max(500).optional().nullable(),
});

export const productSortSchema = z.enum([
  "popular",
  "newest",
  "price_asc",
  "price_desc",
]);

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const truthyInStock = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return undefined;
  if (v === true || v === "true" || v === "1" || v === "on") return true;
  if (v === false || v === "false" || v === "0") return false;
  return undefined;
};

export const createProductSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Название слишком короткое")
    .max(200, "Название слишком длинное"),
  description: z
    .string()
    .trim()
    .max(10_000, "Описание слишком длинное")
    .optional()
    .nullable(),
  /** Major RUB units (rubles). e.g. 4990.5 = 4 990,50 ₽ */
  price: z.coerce
    .number()
    .finite()
    .positive("Цена должна быть больше нуля")
    .max(99_999_999.99, "Цена слишком большая"),
  categoryId: z.string().cuid("Некорректный categoryId").optional().nullable(),
  productTypeId: z
    .string()
    .cuid("Некорректный productTypeId")
    .optional()
    .nullable(),
  /** Characteristic values keyed by definition id */
  characteristics: z
    .array(
      z.object({
        definitionId: z.string().cuid(),
        valueText: z.string().optional().nullable(),
        valueNumber: z.number().optional().nullable(),
        valueBoolean: z.boolean().optional().nullable(),
        valueJson: z.unknown().optional().nullable(),
      }),
    )
    .optional()
    .default([]),
  images: z
    .array(imageSchema)
    .max(10, "Максимум 10 изображений")
    .default([]),
  /**
   * SellerProfile.id — required for create; resolved from authenticated session.
   */
  sellerId: z.string().cuid("Некорректный sellerId").optional(),
  stock: z.coerce.number().int().min(0).default(0),
  city: z
    .string()
    .trim()
    .min(2, "Укажите город")
    .max(100, "Слишком длинное название города")
    .optional()
    .nullable(),
  condition: z
    .nativeEnum(ProductCondition)
    .optional()
    .default(ProductCondition.NEW),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
  sku: z.string().trim().max(64).optional().nullable(),
  weight: z.preprocess(
    emptyToUndefined,
    z.coerce.number().finite().min(0).max(100_000).optional().nullable(),
  ),
  lengthCm: z.preprocess(
    emptyToUndefined,
    z.coerce.number().finite().min(0).max(10_000).optional().nullable(),
  ),
  widthCm: z.preprocess(
    emptyToUndefined,
    z.coerce.number().finite().min(0).max(10_000).optional().nullable(),
  ),
  heightCm: z.preprocess(
    emptyToUndefined,
    z.coerce.number().finite().min(0).max(10_000).optional().nullable(),
  ),
  seoTitle: z.string().trim().max(120).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable(),
  pickupEnabled: z.preprocess(
    (v) => v === true || v === "true" || v === "on" || v === "1",
    z.boolean().optional().default(false),
  ),
  reservationEnabled: z.preprocess(
    (v) => v === true || v === "true" || v === "on" || v === "1",
    z.boolean().optional().default(false),
  ),
  prepaymentPercent: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .refine(
        (n) => [0, 10, 20, 30, 50, 100].includes(n),
        "Допустимы: 0, 10, 20, 30, 50, 100",
      )
      .optional()
      .default(0),
  ),
  /** Pickup point ids linked to the product */
  pickupPointIds: z
    .array(z.string().cuid())
    .max(20)
    .optional()
    .default([]),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema
  .omit({ sellerId: true })
  .partial()
  .extend({
    title: createProductSchema.shape.title.optional(),
    price: createProductSchema.shape.price.optional(),
    images: z.array(imageSchema).max(10, "Максимум 10 изображений").optional(),
  });

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const listProductsQuerySchema = z.object({
  category: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  categoryId: z.preprocess(
    emptyToUndefined,
    z.string().cuid().optional(),
  ),
  sellerId: z.preprocess(emptyToUndefined, z.string().cuid().optional()),
  seller: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  sellerKind: z.preprocess(
    emptyToUndefined,
    z.enum(["SHOP", "INDIVIDUAL"]).optional(),
  ),
  status: z
    .preprocess(
      emptyToUndefined,
      z.union([z.nativeEnum(ProductStatus), z.literal("ALL")]).optional(),
    )
    .default(ProductStatus.ACTIVE),
  q: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  city: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional()),
  condition: z.preprocess(
    emptyToUndefined,
    z.nativeEnum(ProductCondition).optional(),
  ),
  priceMin: z.preprocess(
    emptyToUndefined,
    z.coerce.number().finite().min(0).optional(),
  ),
  priceMax: z.preprocess(
    emptyToUndefined,
    z.coerce.number().finite().min(0).optional(),
  ),
  inStock: z.preprocess(truthyInStock, z.boolean().optional()),
  sort: z.preprocess(
    emptyToUndefined,
    productSortSchema.optional().default("popular"),
  ),
  page: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).optional(),
  ),
  pageSize: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).optional(),
  ),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100).optional(),
  ),
  offset: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).optional(),
  ),
});

export const suggestQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(20).optional().default(8),
  ),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
