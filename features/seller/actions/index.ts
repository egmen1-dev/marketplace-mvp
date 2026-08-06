"use server";

import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  AuthRequiredError,
  requireSellerSession,
  SellerRequiredError,
} from "@/features/auth";
import {
  archiveProduct,
  createProduct,
  deleteProduct,
  duplicateProduct,
  ProductServiceError,
  updateProduct,
} from "@/features/products/queries";
import {
  createProductSchema,
  updateProductSchema,
} from "@/features/products/schemas";
import {
  SellerServiceError,
  updateSellerOrderStatus,
  updateSellerSettings,
} from "@/features/seller/queries";
import { ROUTES } from "@/lib/constants";

export type ProductActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type CreateProductActionState = ProductActionState;
export type UpdateProductActionState = ProductActionState;
export type DeleteProductActionState = ProductActionState;
export type SettingsActionState = ProductActionState;
export type OrderStatusActionState = ProductActionState;

function parseImages(formData: FormData) {
  return String(formData.get("images") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({ url }));
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function authErrorMessage(err: unknown): ProductActionState | null {
  if (err instanceof AuthRequiredError) {
    return { ok: false, error: "Войдите, чтобы управлять товарами" };
  }
  if (err instanceof SellerRequiredError) {
    return { ok: false, error: "Нужен профиль продавца" };
  }
  return null;
}

function fieldErrorsFromZod(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

function productFormPayload(formData: FormData, sellerProfileId?: string) {
  return {
    title: formData.get("title"),
    description: formData.get("description") || null,
    price: formData.get("price"),
    categoryId: formData.get("categoryId") || null,
    ...(sellerProfileId ? { sellerId: sellerProfileId } : {}),
    stock: formData.get("stock") || 0,
    city: formData.get("city") || null,
    condition: formData.get("condition") || "NEW",
    status: formData.get("status") || "ACTIVE",
    sku: emptyToNull(formData.get("sku")),
    weight: emptyToNull(formData.get("weight")),
    lengthCm: emptyToNull(formData.get("lengthCm")),
    widthCm: emptyToNull(formData.get("widthCm")),
    heightCm: emptyToNull(formData.get("heightCm")),
    seoTitle: emptyToNull(formData.get("seoTitle")),
    seoDescription: emptyToNull(formData.get("seoDescription")),
    images: parseImages(formData),
  };
}

export async function createProductAction(
  _prev: CreateProductActionState,
  formData: FormData,
): Promise<CreateProductActionState> {
  let sellerProfileId: string;
  let userId: string;
  try {
    const seller = await requireSellerSession();
    sellerProfileId = seller.sellerProfileId;
    userId = seller.userId;
  } catch (err) {
    const authErr = authErrorMessage(err);
    if (authErr) return authErr;
    throw err;
  }

  const parsed = createProductSchema.safeParse(
    productFormPayload(formData, sellerProfileId),
  );

  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверьте поля формы",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    await createProduct(
      { ...parsed.data, sellerId: sellerProfileId },
      { actorUserId: userId },
    );
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return { ok: false, error: err.message };
    }
    console.error("[createProductAction]", err);
    return { ok: false, error: "Не удалось создать товар" };
  }

  revalidatePath(ROUTES.CATALOG);
  revalidatePath(ROUTES.HOME);
  revalidatePath(ROUTES.SELLER);
  revalidatePath(ROUTES.SELLER_DASHBOARD);
  revalidatePath(ROUTES.SELLER_PRODUCTS);
  redirect(ROUTES.SELLER_PRODUCTS);
}

export async function updateProductAction(
  productId: string,
  _prev: UpdateProductActionState,
  formData: FormData,
): Promise<UpdateProductActionState> {
  let sellerProfileId: string;
  let userId: string;
  try {
    const seller = await requireSellerSession();
    sellerProfileId = seller.sellerProfileId;
    userId = seller.userId;
  } catch (err) {
    const authErr = authErrorMessage(err);
    if (authErr) return authErr;
    throw err;
  }

  const parsed = updateProductSchema.safeParse(productFormPayload(formData));

  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверьте поля формы",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    await updateProduct(productId, sellerProfileId, parsed.data, {
      actorUserId: userId,
    });
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return { ok: false, error: err.message };
    }
    console.error("[updateProductAction]", err);
    return { ok: false, error: "Не удалось сохранить товар" };
  }

  revalidatePath(ROUTES.CATALOG);
  revalidatePath(ROUTES.HOME);
  revalidatePath(ROUTES.SELLER);
  revalidatePath(ROUTES.SELLER_DASHBOARD);
  revalidatePath(ROUTES.SELLER_PRODUCTS);
  revalidatePath(`${ROUTES.PRODUCT}/${productId}`);
  redirect(ROUTES.SELLER_PRODUCTS);
}

export async function deleteProductAction(
  productId: string,
): Promise<DeleteProductActionState> {
  let sellerProfileId: string;
  try {
    const seller = await requireSellerSession();
    sellerProfileId = seller.sellerProfileId;
  } catch (err) {
    const authErr = authErrorMessage(err);
    if (authErr) return authErr;
    throw err;
  }

  try {
    await deleteProduct(productId, sellerProfileId);
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return { ok: false, error: err.message };
    }
    console.error("[deleteProductAction]", err);
    return { ok: false, error: "Не удалось удалить товар" };
  }

  revalidatePath(ROUTES.CATALOG);
  revalidatePath(ROUTES.HOME);
  revalidatePath(ROUTES.SELLER);
  revalidatePath(ROUTES.SELLER_DASHBOARD);
  revalidatePath(ROUTES.SELLER_PRODUCTS);
  return { ok: true };
}

export async function archiveProductAction(
  productId: string,
): Promise<ProductActionState> {
  let sellerProfileId: string;
  try {
    const seller = await requireSellerSession();
    sellerProfileId = seller.sellerProfileId;
  } catch (err) {
    const authErr = authErrorMessage(err);
    if (authErr) return authErr;
    throw err;
  }

  try {
    await archiveProduct(productId, sellerProfileId);
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return { ok: false, error: err.message };
    }
    console.error("[archiveProductAction]", err);
    return { ok: false, error: "Не удалось архивировать товар" };
  }

  revalidatePath(ROUTES.CATALOG);
  revalidatePath(ROUTES.SELLER_PRODUCTS);
  revalidatePath(ROUTES.SELLER_DASHBOARD);
  return { ok: true };
}

export async function duplicateProductAction(
  productId: string,
): Promise<ProductActionState & { newProductId?: string }> {
  let sellerProfileId: string;
  let userId: string;
  try {
    const seller = await requireSellerSession();
    sellerProfileId = seller.sellerProfileId;
    userId = seller.userId;
  } catch (err) {
    const authErr = authErrorMessage(err);
    if (authErr) return authErr;
    throw err;
  }

  try {
    const copy = await duplicateProduct(productId, sellerProfileId, {
      actorUserId: userId,
    });
    revalidatePath(ROUTES.SELLER_PRODUCTS);
    revalidatePath(ROUTES.SELLER_DASHBOARD);
    return { ok: true, newProductId: copy.id };
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return { ok: false, error: err.message };
    }
    console.error("[duplicateProductAction]", err);
    return { ok: false, error: "Не удалось дублировать товар" };
  }
}

const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000).optional().nullable(),
  logoUrl: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().url().nullable().optional(),
  ),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().email().nullable().optional(),
  ),
  address: z.string().trim().max(500).optional().nullable(),
  shippingDefaults: z.string().trim().max(2000).optional().nullable(),
});

export async function updateSellerSettingsAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  let sellerProfileId: string;
  try {
    const seller = await requireSellerSession();
    sellerProfileId = seller.sellerProfileId;
  } catch (err) {
    const authErr = authErrorMessage(err);
    if (authErr) return authErr;
    throw err;
  }

  const parsed = settingsSchema.safeParse({
    storeName: formData.get("storeName"),
    description: emptyToNull(formData.get("description")),
    logoUrl: emptyToNull(formData.get("logoUrl")),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
    address: emptyToNull(formData.get("address")),
    shippingDefaults: emptyToNull(formData.get("shippingDefaults")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверьте поля формы",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    await updateSellerSettings(sellerProfileId, parsed.data);
  } catch (err) {
    if (err instanceof SellerServiceError) {
      return { ok: false, error: err.message };
    }
    console.error("[updateSellerSettingsAction]", err);
    return { ok: false, error: "Не удалось сохранить настройки" };
  }

  revalidatePath(ROUTES.SELLER_SETTINGS);
  revalidatePath(ROUTES.SELLER_DASHBOARD);
  revalidatePath(`${ROUTES.SELLER_PUBLIC}/${sellerProfileId}`);
  return { ok: true };
}

export async function updateSellerOrderStatusAction(
  orderId: string,
  toStatus: OrderStatus,
  note?: string | null,
): Promise<OrderStatusActionState> {
  let seller;
  try {
    seller = await requireSellerSession();
  } catch (err) {
    const authErr = authErrorMessage(err);
    if (authErr) return authErr;
    throw err;
  }

  try {
    await updateSellerOrderStatus({
      orderId,
      toStatus,
      actorUserId: seller.userId,
      actorRole: seller.role,
      sellerProfileId: seller.sellerProfileId,
      note,
    });
  } catch (err) {
    if (err instanceof SellerServiceError) {
      return { ok: false, error: err.message };
    }
    console.error("[updateSellerOrderStatusAction]", err);
    return { ok: false, error: "Не удалось обновить статус" };
  }

  revalidatePath(ROUTES.SELLER_ORDERS);
  revalidatePath(ROUTES.SELLER_DASHBOARD);
  revalidatePath(ROUTES.ORDERS);
  return { ok: true };
}
