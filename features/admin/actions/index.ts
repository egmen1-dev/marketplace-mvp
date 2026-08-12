"use server";

import {
  Prisma,
  ProductStatus,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AdminRequiredError,
  AuthRequiredError,
  requireAdminSession,
} from "@/features/auth";
import { logAdminAction } from "@/features/admin/queries";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

export type AdminActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

function authError(err: unknown): AdminActionState | null {
  if (err instanceof AuthRequiredError) {
    return { ok: false, error: "Требуется вход" };
  }
  if (err instanceof AdminRequiredError) {
    return { ok: false, error: "Требуются права администратора" };
  }
  return null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "category";
}

async function uniqueCategorySlug(base: string, excludeId?: string) {
  const slug = slugify(base);
  let n = 0;
  for (;;) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const existing = await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
  }
}

const roleSchema = z.enum(["BUYER", "SELLER", "ADMIN"]);

export async function updateUserRoleAction(
  userId: string,
  role: string,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) {
    return { ok: false, error: "Некорректная роль" };
  }

  if (userId === admin.id && parsed.data !== UserRole.ADMIN) {
    return { ok: false, error: "Нельзя снять свою роль ADMIN" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });
  if (!user) return { ok: false, error: "Пользователь не найден" };

  const nextRole = parsed.data as UserRole;
  if (user.role === nextRole) return { ok: true };

  await prisma.user.update({
    where: { id: userId },
    data: { role: nextRole },
  });

  if (nextRole === UserRole.SELLER) {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      const storeName = `Магазин ${user.email.split("@")[0] ?? "продавец"}`;
      const baseSlug = slugify(storeName);
      let slug = baseSlug;
      let n = 0;
      for (;;) {
        const clash = await prisma.sellerProfile.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (!clash) break;
        n += 1;
        slug = `${baseSlug}-${n}`;
      }
      await prisma.sellerProfile.create({
        data: { userId, storeName, slug },
      });
    }
  }

  await logAdminAction({
    adminId: admin.id,
    action: "USER_ROLE_CHANGE",
    entityType: "User",
    entityId: userId,
    meta: { from: user.role, to: nextRole },
  });

  revalidatePath(ROUTES.ADMIN_USERS);
  revalidatePath(ROUTES.ADMIN);
  return { ok: true };
}

export async function setUserBlockedAction(
  userId: string,
  isBlocked: boolean,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  if (userId === admin.id && isBlocked) {
    return { ok: false, error: "Нельзя заблокировать себя" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return { ok: false, error: "Пользователь не найден" };

  await prisma.user.update({
    where: { id: userId },
    data: { isBlocked },
  });

  await logAdminAction({
    adminId: admin.id,
    action: isBlocked ? "USER_BLOCK" : "USER_UNBLOCK",
    entityType: "User",
    entityId: userId,
  });

  revalidatePath(ROUTES.ADMIN_USERS);
  revalidatePath(ROUTES.ADMIN_SELLERS);
  return { ok: true };
}

export async function setSellerBlockedAction(
  sellerId: string,
  isBlocked: boolean,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { id: true },
  });
  if (!seller) return { ok: false, error: "Продавец не найден" };

  await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: { isBlocked },
  });

  await logAdminAction({
    adminId: admin.id,
    action: isBlocked ? "SELLER_BLOCK" : "SELLER_UNBLOCK",
    entityType: "SellerProfile",
    entityId: sellerId,
  });

  revalidatePath(ROUTES.ADMIN_SELLERS);
  return { ok: true };
}

export async function setSellerVerifiedAction(
  sellerId: string,
  isVerified: boolean,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: { id: true },
  });
  if (!seller) return { ok: false, error: "Продавец не найден" };

  await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: {
      isVerified,
      verifiedAt: isVerified ? new Date() : null,
    },
  });

  await logAdminAction({
    adminId: admin.id,
    action: isVerified ? "SELLER_VERIFY" : "SELLER_UNVERIFY",
    entityType: "SellerProfile",
    entityId: sellerId,
  });

  revalidatePath(ROUTES.ADMIN_SELLERS);
  revalidatePath(`${ROUTES.SELLER_PUBLIC}/${sellerId}`);
  return { ok: true };
}

export async function setProductStatusAction(
  productId: string,
  status: string,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  const parsed = z
    .enum(["ACTIVE", "DRAFT", "ARCHIVED", "OUT_OF_STOCK"])
    .safeParse(status);
  if (!parsed.success) {
    return { ok: false, error: "Некорректный статус" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true },
  });
  if (!product) return { ok: false, error: "Товар не найден" };

  const next = parsed.data as ProductStatus;
  await prisma.product.update({
    where: { id: productId },
    data: { status: next },
  });

  const action =
    next === ProductStatus.ARCHIVED
      ? "PRODUCT_HIDE"
      : next === ProductStatus.ACTIVE
        ? "PRODUCT_ACTIVATE"
        : "PRODUCT_STATUS_CHANGE";

  await logAdminAction({
    adminId: admin.id,
    action,
    entityType: "Product",
    entityId: productId,
    meta: { from: product.status, to: next },
  });

  revalidatePath(ROUTES.ADMIN_PRODUCTS);
  revalidatePath(ROUTES.ADMIN);
  return { ok: true };
}

export async function deleteProductAdminAction(
  productId: string,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      _count: { select: { orderItems: true } },
    },
  });
  if (!product) return { ok: false, error: "Товар не найден" };

  if (product._count.orderItems > 0) {
    await prisma.product.update({
      where: { id: productId },
      data: { status: ProductStatus.ARCHIVED },
    });
    await logAdminAction({
      adminId: admin.id,
      action: "PRODUCT_ARCHIVE_INSTEAD_OF_DELETE",
      entityType: "Product",
      entityId: productId,
      meta: { reason: "has_order_items" },
    });
    revalidatePath(ROUTES.ADMIN_PRODUCTS);
    return {
      ok: true,
      message: "Товар архивирован — есть в заказах",
    };
  }

  try {
    await prisma.product.delete({ where: { id: productId } });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      await prisma.product.update({
        where: { id: productId },
        data: { status: ProductStatus.ARCHIVED },
      });
      await logAdminAction({
        adminId: admin.id,
        action: "PRODUCT_ARCHIVE_INSTEAD_OF_DELETE",
        entityType: "Product",
        entityId: productId,
        meta: { reason: "fk_restrict" },
      });
      revalidatePath(ROUTES.ADMIN_PRODUCTS);
      return { ok: true, message: "Товар архивирован (FK)" };
    }
    throw err;
  }

  await logAdminAction({
    adminId: admin.id,
    action: "PRODUCT_DELETE",
    entityType: "Product",
    entityId: productId,
  });

  revalidatePath(ROUTES.ADMIN_PRODUCTS);
  revalidatePath(ROUTES.ADMIN);
  return { ok: true, message: "Товар удалён" };
}

const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120).optional().nullable(),
  parentId: z.string().trim().nullable().optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export async function createCategoryAction(
  formData: FormData,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || null,
    parentId: formData.get("parentId") || null,
    description: formData.get("description") || null,
    sortOrder: formData.get("sortOrder") || 0,
    isActive: formData.get("isActive") !== "false",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Проверьте поля категории",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  let level = 1;
  if (parsed.data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parsed.data.parentId },
      select: { id: true, level: true },
    });
    if (!parent) return { ok: false, error: "Родительская категория не найдена" };
    level = Math.min(3, parent.level + 1);
  }

  const slug = await uniqueCategorySlug(
    parsed.data.slug?.trim() || parsed.data.name,
  );

  const created = await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug,
      parentId: parsed.data.parentId || null,
      description: parsed.data.description || null,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
      level,
    },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "CATEGORY_CREATE",
    entityType: "Category",
    entityId: created.id,
    meta: { name: created.name, slug: created.slug },
  });

  revalidatePath(ROUTES.ADMIN_CATEGORIES);
  revalidatePath(ROUTES.CATEGORIES);
  return { ok: true };
}

export async function updateCategoryAction(
  categoryId: string,
  formData: FormData,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  const existing = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Категория не найдена" };

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || null,
    parentId: formData.get("parentId") || null,
    description: formData.get("description") || null,
    sortOrder: formData.get("sortOrder") || 0,
    isActive: formData.get("isActive") !== "false",
  });
  if (!parsed.success) {
    return { ok: false, error: "Проверьте поля категории" };
  }

  if (parsed.data.parentId === categoryId) {
    return { ok: false, error: "Категория не может быть родителем самой себе" };
  }

  let level = 1;
  if (parsed.data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: parsed.data.parentId },
      select: { id: true, level: true },
    });
    if (!parent) return { ok: false, error: "Родительская категория не найдена" };
    level = Math.min(3, parent.level + 1);
  }

  const slug = await uniqueCategorySlug(
    parsed.data.slug?.trim() || parsed.data.name,
    categoryId,
  );

  await prisma.category.update({
    where: { id: categoryId },
    data: {
      name: parsed.data.name,
      slug,
      parentId: parsed.data.parentId || null,
      description: parsed.data.description || null,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
      level,
    },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "CATEGORY_UPDATE",
    entityType: "Category",
    entityId: categoryId,
    meta: { name: parsed.data.name, slug },
  });

  revalidatePath(ROUTES.ADMIN_CATEGORIES);
  revalidatePath(ROUTES.CATEGORIES);
  return { ok: true };
}

export async function setCategoryActiveAction(
  categoryId: string,
  isActive: boolean,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  const existing = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Категория не найдена" };

  await prisma.category.update({
    where: { id: categoryId },
    data: { isActive },
  });

  await logAdminAction({
    adminId: admin.id,
    action: isActive ? "CATEGORY_SHOW" : "CATEGORY_HIDE",
    entityType: "Category",
    entityId: categoryId,
  });

  revalidatePath(ROUTES.ADMIN_CATEGORIES);
  revalidatePath(ROUTES.CATEGORIES);
  return { ok: true };
}

export async function deleteAdminProductAction(
  productId: string,
): Promise<AdminActionState> {
  return deleteProductAdminAction(productId);
}

export async function changeUserRoleAction(
  userId: string,
  role: string,
): Promise<AdminActionState> {
  return updateUserRoleAction(userId, role);
}

export async function hideCategoryAction(
  categoryId: string,
): Promise<AdminActionState> {
  return setCategoryActiveAction(categoryId, false);
}

export async function showCategoryAction(
  categoryId: string,
): Promise<AdminActionState> {
  return setCategoryActiveAction(categoryId, true);
}

export async function setTaxonomyImportItemStatusAction(
  itemId: string,
  status: "APPROVED" | "REJECTED" | "PENDING",
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  const item = await prisma.taxonomyImportItem.findUnique({
    where: { id: itemId },
    select: { id: true, batchId: true, action: true },
  });
  if (!item) return { ok: false, error: "Элемент не найден" };

  await prisma.taxonomyImportItem.update({
    where: { id: itemId },
    data: { status },
  });

  await logAdminAction({
    adminId: admin.id,
    action: `TAXONOMY_IMPORT_ITEM_${status}`,
    entityType: "TaxonomyImportItem",
    entityId: itemId,
    meta: { batchId: item.batchId, itemAction: item.action },
  });

  revalidatePath(ROUTES.ADMIN_TAXONOMY_IMPORT);
  return { ok: true, message: status };
}

export async function applyTaxonomyImportBatchAction(
  batchId: string,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  try {
    const { applyImportBatch } = await import("@/lib/catalog-taxonomy/import");
    const report = await applyImportBatch(prisma, batchId, {
      autoApproveSafe: false,
    });
    await logAdminAction({
      adminId: admin.id,
      action: "TAXONOMY_IMPORT_APPLY",
      entityType: "TaxonomyImportBatch",
      entityId: batchId,
      meta: report as unknown as Record<string, unknown>,
    });
    revalidatePath(ROUTES.ADMIN_TAXONOMY_IMPORT);
    revalidatePath(ROUTES.ADMIN_CATEGORIES);
    return {
      ok: true,
      message: `Applied ${report.appliedItems} items (merges=${report.merges})`,
    };
  } catch (err) {
    console.error("[applyTaxonomyImportBatchAction]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Apply failed",
    };
  }
}

export async function runTaxonomyImportDryRunAction(): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  try {
    const { resolveTaxonomyProvider } = await import(
      "@/lib/catalog-taxonomy/providers"
    );
    const { buildImportPlan, saveImportBatch } = await import(
      "@/lib/catalog-taxonomy/import"
    );
    const provider = resolveTaxonomyProvider({ preferSnapshot: true });
    const taxonomy = await provider.fetchTaxonomy();
    const plan = await buildImportPlan(prisma, taxonomy);
    const { batchId } = await saveImportBatch(prisma, plan, {
      createdBy: admin.id,
    });
    await logAdminAction({
      adminId: admin.id,
      action: "TAXONOMY_IMPORT_DRY_RUN",
      entityType: "TaxonomyImportBatch",
      entityId: batchId,
      meta: plan.statistics as unknown as Record<string, unknown>,
    });
    revalidatePath(ROUTES.ADMIN_TAXONOMY_IMPORT);
    return {
      ok: true,
      message: `Dry-run batch ${batchId} (created=${plan.statistics.created}, review=${plan.statistics.needReview})`,
    };
  } catch (err) {
    console.error("[runTaxonomyImportDryRunAction]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Dry-run failed",
    };
  }
}

export async function approveSeoPageAction(
  pageId: string,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  const page = await prisma.seoPage.findUnique({ where: { id: pageId } });
  if (!page) return { ok: false, error: "SEO page not found" };

  const draft = page.aiDraft as
    | { title?: string; description?: string; content?: string }
    | null;

  await prisma.seoPage.update({
    where: { id: pageId },
    data: {
      status: "APPROVED",
      indexable: page.score >= 45,
      title: page.title ?? draft?.title ?? page.title,
      description: page.description ?? draft?.description ?? page.description,
      content: page.content ?? draft?.content ?? page.content,
    },
  });

  await logAdminAction({
    adminId: admin.id,
    action: "SEO_PAGE_APPROVE",
    entityType: "SeoPage",
    entityId: pageId,
  });
  revalidatePath(ROUTES.ADMIN_SEO);
  return { ok: true, message: "Approved" };
}

export async function disableSeoPageIndexingAction(
  pageId: string,
): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  await prisma.seoPage.update({
    where: { id: pageId },
    data: { indexable: false, status: "DISABLED" },
  });
  await logAdminAction({
    adminId: admin.id,
    action: "SEO_PAGE_DISABLE",
    entityType: "SeoPage",
    entityId: pageId,
  });
  revalidatePath(ROUTES.ADMIN_SEO);
  return { ok: true, message: "Indexing disabled" };
}

export async function generateSeoDraftAction(): Promise<AdminActionState> {
  let admin;
  try {
    admin = await requireAdminSession();
  } catch (err) {
    return authError(err) ?? { ok: false, error: "Ошибка доступа" };
  }

  const { draftBrandAiSeo, brandPagePath, computeSeoScore } = await import(
    "@/lib/seo"
  );
  const { APP_NAME } = await import("@/lib/constants");
  const brands = await prisma.brand.findMany({
    where: { isActive: true, products: { some: { status: "ACTIVE" } } },
    take: 20,
    include: {
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });

  let created = 0;
  for (const b of brands) {
    const path = brandPagePath(b.slug);
    const existing = await prisma.seoPage.findUnique({ where: { path } });
    if (existing) continue;
    const draft = draftBrandAiSeo({ name: b.name, appName: APP_NAME });
    const score = computeSeoScore({
      hasTitle: true,
      hasDescription: true,
      contentLength: draft.content.length,
      productCount: b._count.products,
      internalLinkCount: 2,
      hasUniqueText: true,
      hasFacets: false,
    });
    await prisma.seoPage.create({
      data: {
        entityType: "BRAND",
        entityId: b.id,
        path,
        slug: b.slug,
        title: draft.title,
        description: draft.description,
        content: null,
        aiDraft: draft,
        status: "PENDING_REVIEW",
        indexable: false,
        score,
      },
    });
    created += 1;
  }

  await logAdminAction({
    adminId: admin.id,
    action: "SEO_GENERATE_DRAFTS",
    entityType: "SeoPage",
    entityId: "batch",
    meta: { created },
  });
  revalidatePath(ROUTES.ADMIN_SEO);
  return { ok: true, message: `Created ${created} brand SEO drafts` };
}
