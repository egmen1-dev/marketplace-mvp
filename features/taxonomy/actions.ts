"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdminSession } from "@/features/auth";
import { normalizeAlias } from "@/lib/catalog-taxonomy";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

export type TaxonomyActionState = {
  ok: boolean;
  error?: string;
};

export async function addProductTypeAliasAction(
  formData: FormData,
): Promise<TaxonomyActionState> {
  await requireAdminSession();
  const parsed = z
    .object({
      productTypeId: z.string().cuid(),
      alias: z.string().trim().min(2).max(120),
    })
    .safeParse({
      productTypeId: formData.get("productTypeId"),
      alias: formData.get("alias"),
    });
  if (!parsed.success) return { ok: false, error: "Проверьте поля" };

  const normalized = normalizeAlias(parsed.data.alias);
  await prisma.productTypeAlias.upsert({
    where: {
      productTypeId_normalized: {
        productTypeId: parsed.data.productTypeId,
        normalized,
      },
    },
    create: {
      productTypeId: parsed.data.productTypeId,
      alias: parsed.data.alias.trim(),
      normalized,
    },
    update: { alias: parsed.data.alias.trim() },
  });
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function renameProductTypeLotNameAction(
  formData: FormData,
): Promise<TaxonomyActionState> {
  await requireAdminSession();
  const parsed = z
    .object({
      productTypeId: z.string().cuid(),
      lotName: z.string().trim().min(2).max(200),
    })
    .safeParse({
      productTypeId: formData.get("productTypeId"),
      lotName: formData.get("lotName"),
    });
  if (!parsed.success) return { ok: false, error: "Проверьте поля" };

  await prisma.productType.update({
    where: { id: parsed.data.productTypeId },
    data: {
      lotName: parsed.data.lotName,
      locallyEdited: true,
    },
  });
  revalidatePath("/admin/categories");
  revalidatePath(ROUTES.CATALOG);
  return { ok: true };
}

export async function toggleProductTypeActiveAction(
  formData: FormData,
): Promise<TaxonomyActionState> {
  await requireAdminSession();
  const id = String(formData.get("productTypeId") ?? "");
  const next = formData.get("isActive") === "true";
  if (!id) return { ok: false, error: "Нет id" };
  await prisma.productType.update({
    where: { id },
    data: { isActive: next, locallyEdited: true },
  });
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function renameCategoryLotNameAction(
  formData: FormData,
): Promise<TaxonomyActionState> {
  await requireAdminSession();
  const parsed = z
    .object({
      categoryId: z.string().cuid(),
      name: z.string().trim().min(2).max(200),
    })
    .safeParse({
      categoryId: formData.get("categoryId"),
      name: formData.get("name"),
    });
  if (!parsed.success) return { ok: false, error: "Проверьте поля" };

  await prisma.category.update({
    where: { id: parsed.data.categoryId },
    data: { name: parsed.data.name, locallyEdited: true },
  });
  revalidatePath("/admin/categories");
  return { ok: true };
}
