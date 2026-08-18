import { ProductStatus } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { listCategories } from "@/features/catalog/queries";
import {
  createProduct,
  getProductById,
  ProductServiceError,
  updateProduct,
} from "@/features/products/queries";
import { createProductSchema, updateProductSchema } from "@/features/products/schemas";
import {
  getProductTypeWithCharacteristics,
  listCategoryChildren,
  listProductTypesForCategory,
} from "@/features/taxonomy/queries";
import { withMobileApiContract } from "@/lib/mobile/api-contract";
import { resolvePublicImageUrl } from "@/lib/images";
import { prisma } from "@/lib/prisma";

import type {
  MobileSellerCategoryOption,
  MobileSellerProductEditorInput,
  MobileSellerProductEditorPayload,
  MobileSellerProductEditorSaveResult,
  MobileSellerTaxonomyBrowse,
} from "./seller-product-editor-types";

function formatModerationIssues(issues: unknown): string[] {
  if (Array.isArray(issues)) {
    return issues.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (issues && typeof issues === "object") {
    return Object.values(issues as Record<string, unknown>).filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
  }
  return [];
}

function mapEditorPayload(
  product: NonNullable<Awaited<ReturnType<typeof getProductById>>>,
  moderationRow: {
    status: string;
    notes: string | null;
    issues: unknown;
    qualityScore: number | null;
    updatedAt: Date;
  } | null,
): MobileSellerProductEditorPayload {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    compareAt: product.compareAt,
    currency: product.currency,
    stock: product.stock,
    sku: product.sku,
    status: product.status,
    categoryId: product.category?.id ?? product.productType?.categoryId ?? null,
    categoryName: product.category?.name ?? null,
    productTypeId: product.productType?.id ?? null,
    productTypeName: product.productType?.name ?? null,
    images: product.images.map((img, index) => ({
      url: resolvePublicImageUrl(img.url) ?? img.url,
      alt: img.alt,
      pathname: null,
      isPrimary: img.isPrimary ?? index === 0,
    })),
    characteristics: product.characteristics.map((c) => ({
      definitionId: c.definitionId,
      name: c.name,
      slug: c.slug,
      type: "text",
      required: false,
      unit: c.unit,
      options: null,
      valueText: c.formValue,
      displayValue: c.displayValue,
    })),
    moderation: moderationRow
      ? {
          status: moderationRow.status as MobileSellerProductEditorPayload["moderation"] extends infer T
            ? T extends { status: infer S }
              ? S
              : never
            : never,
          reason: moderationRow.notes ?? null,
          issues: formatModerationIssues(moderationRow.issues),
          qualityScore: moderationRow.qualityScore,
          updatedAt: moderationRow.updatedAt.toISOString(),
        }
      : null,
    previewAvailable: product.status === ProductStatus.ACTIVE,
    previewProductId: product.status === ProductStatus.ACTIVE ? product.id : null,
    updatedAt: product.updatedAt,
    createdAt: product.createdAt,
  };
}

async function requireSellerFromRequest(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return null;
  }
  return user;
}

export async function buildMobileSellerProductEditorFromRequest(
  request: Request,
  productId: string | null,
): Promise<MobileSellerProductEditorPayload | null> {
  const user = await requireSellerFromRequest(request);
  if (!user) return null;

  if (!productId) {
    return {
      id: null,
      title: "",
      description: null,
      price: 0,
      compareAt: null,
      currency: "RUB",
      stock: 0,
      sku: null,
      status: ProductStatus.DRAFT,
      categoryId: null,
      categoryName: null,
      productTypeId: null,
      productTypeName: null,
      images: [],
      characteristics: [],
      moderation: null,
      previewAvailable: false,
      previewProductId: null,
      updatedAt: null,
      createdAt: null,
    };
  }

  const [product, moderationRow] = await Promise.all([
    getProductById(productId, {
      userId: user.id,
      role: user.role,
      sellerProfileId: user.sellerProfileId,
    }),
    prisma.productModeration.findUnique({
      where: { productId },
      select: {
        status: true,
        notes: true,
        issues: true,
        qualityScore: true,
        updatedAt: true,
      },
    }),
  ]);
  if (!product || product.seller.id !== user.sellerProfileId) {
    return null;
  }

  const payload = mapEditorPayload(product, moderationRow);

  if (payload.productTypeId) {
    const typeDetail = await getProductTypeWithCharacteristics(payload.productTypeId);
    if (typeDetail) {
      const valueByDef = new Map(payload.characteristics.map((c) => [c.definitionId, c]));
      payload.characteristics = typeDetail.characteristics.map((def) => {
        const existing = valueByDef.get(def.id);
        return {
          definitionId: def.id,
          name: def.name,
          slug: def.slug,
          type: def.type,
          required: def.required,
          unit: def.unit,
          options: def.options,
          valueText: existing?.valueText ?? null,
          valueNumber: existing?.valueNumber ?? null,
          valueBoolean: existing?.valueBoolean ?? null,
          displayValue: existing?.displayValue ?? null,
        };
      });
    }
  }

  return payload;
}

export async function saveMobileSellerProductFromRequest(
  request: Request,
  productId: string | null,
  input: MobileSellerProductEditorInput,
): Promise<MobileSellerProductEditorSaveResult> {
  const user = await requireSellerFromRequest(request);
  if (!user) {
    throw new ProductServiceError("AUTHENTICATION", "Требуется аккаунт продавца", 401);
  }

  const body = {
    title: input.title,
    description: input.description ?? null,
    price: input.price,
    stock: input.stock,
    sku: input.sku ?? null,
    categoryId: input.categoryId ?? null,
    productTypeId: input.productTypeId ?? null,
    status: input.status ?? ProductStatus.DRAFT,
    images: (input.images ?? []).map((img) => ({
      url: img.url,
      alt: img.alt ?? null,
      pathname: img.pathname ?? null,
    })),
    characteristics: input.characteristics ?? [],
  };

  if (productId) {
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      throw new ProductServiceError(
        "VALIDATION",
        parsed.error.issues.map((i) => i.message).join("; ") || "Ошибка валидации",
        400,
      );
    }
    try {
      const saved = await updateProduct(productId, user.sellerProfileId, parsed.data, {
        actorUserId: user.id,
      });
      return {
        id: saved.id,
        status: saved.status,
        updatedAt: saved.updatedAt,
      };
    } catch (err) {
      if (err instanceof ProductServiceError && err.code === "MODERATION_PENDING") {
        return {
          id: productId,
          status: ProductStatus.DRAFT,
          updatedAt: new Date().toISOString(),
          moderationPending: true,
        };
      }
      throw err;
    }
  }

  const parsed = createProductSchema.safeParse({ ...body, sellerId: user.sellerProfileId });
  if (!parsed.success) {
    throw new ProductServiceError(
      "VALIDATION",
      parsed.error.issues.map((i) => i.message).join("; ") || "Ошибка валидации",
      400,
    );
  }

  const saved = await createProduct({
    ...parsed.data,
    sellerId: user.sellerProfileId,
    status: ProductStatus.DRAFT,
  });

  return {
    id: saved.id,
    status: saved.status,
    updatedAt: saved.createdAt,
  };
}

export async function buildMobileSellerCategoriesFromRequest(request: Request) {
  const user = await requireSellerFromRequest(request);
  if (!user) return { items: [] as MobileSellerCategoryOption[] };

  const items = await listCategories({ activeOnly: true });
  return {
    items: items.map(
      (c): MobileSellerCategoryOption => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
        productCount: c.productCount,
        pathLabel: c.pathLabel ?? null,
      }),
    ),
  };
}

export async function buildMobileSellerTaxonomyBrowseFromRequest(
  request: Request,
  params: { categoryId?: string | null; productTypeId?: string | null },
): Promise<MobileSellerTaxonomyBrowse | null> {
  const user = await requireSellerFromRequest(request);
  if (!user) return null;

  if (params.productTypeId) {
    const detail = await getProductTypeWithCharacteristics(params.productTypeId);
    if (!detail) return null;
    return {
      children: [],
      productTypes: [],
      characteristics: detail.characteristics,
    };
  }

  const categoryId = params.categoryId ?? "root";
  if (categoryId === "root" || categoryId === "") {
    const children = await listCategoryChildren(null);
    return {
      children: children.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parentId: null,
        productCount: c._count.productTypes,
      })),
      productTypes: [],
    };
  }

  const [children, productTypes] = await Promise.all([
    listCategoryChildren(categoryId),
    listProductTypesForCategory(categoryId),
  ]);

  return {
    children: children.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: categoryId,
      productCount: c._count.productTypes,
    })),
    productTypes,
  };
}

export function wrapMobileEditorContract<T>(payload: T, cacheKey: string) {
  return withMobileApiContract(payload, cacheKey);
}
