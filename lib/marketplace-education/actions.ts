"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/features/auth";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

import { isMarketplaceEducationEnabled } from "./flags";
import {
  assertMarketplaceEducationAccess,
  MarketplaceEducationForbiddenError,
} from "./permissions";
import { EDUCATION_ENTITY_TYPE } from "./types";

export type EducationActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function logEducationAction(input: {
  adminId: string;
  contentId: string;
  action: string;
  meta?: Record<string, string | number | boolean>;
}): Promise<void> {
  await prisma.adminActionLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      entityType: EDUCATION_ENTITY_TYPE,
      entityId: input.contentId,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
  });
}

export async function toggleEducationContentAction(
  contentId: string,
  enabled: boolean,
): Promise<EducationActionResult> {
  if (!isMarketplaceEducationEnabled()) {
    return { ok: false, error: "Education layer выключен" };
  }

  try {
    const admin = await requireAdminSession();
    assertMarketplaceEducationAccess(admin.role);

    await logEducationAction({
      adminId: admin.id,
      contentId,
      action: enabled ? "CONTENT_ENABLED" : "CONTENT_DISABLED",
      meta: { enabled },
    });

    await trackServerEvent({
      event: ANALYTICS_EVENTS.EDUCATION_VIEW,
      route: ROUTES.ADMIN_EDUCATION,
      entityId: contentId,
    });

    revalidatePath(ROUTES.ADMIN_EDUCATION);
    return { ok: true };
  } catch (err) {
    if (err instanceof MarketplaceEducationForbiddenError) {
      return { ok: false, error: err.message };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось обновить контент",
    };
  }
}

export async function updateEducationContentPriorityAction(
  contentId: string,
  priority: number,
): Promise<EducationActionResult> {
  if (!isMarketplaceEducationEnabled()) {
    return { ok: false, error: "Education layer выключен" };
  }

  try {
    const admin = await requireAdminSession();
    assertMarketplaceEducationAccess(admin.role);

    const safePriority = Math.max(0, Math.min(100, Math.round(priority)));

    await logEducationAction({
      adminId: admin.id,
      contentId,
      action: "CONTENT_PRIORITY",
      meta: { priority: safePriority },
    });

    revalidatePath(ROUTES.ADMIN_EDUCATION);
    return { ok: true };
  } catch (err) {
    if (err instanceof MarketplaceEducationForbiddenError) {
      return { ok: false, error: err.message };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось обновить приоритет",
    };
  }
}

export async function updateEducationContentDescriptionAction(
  contentId: string,
  description: string,
): Promise<EducationActionResult> {
  if (!isMarketplaceEducationEnabled()) {
    return { ok: false, error: "Education layer выключен" };
  }

  try {
    const admin = await requireAdminSession();
    assertMarketplaceEducationAccess(admin.role);

    await logEducationAction({
      adminId: admin.id,
      contentId,
      action: "CONTENT_EDIT",
      meta: { description: description.slice(0, 500) },
    });

    revalidatePath(ROUTES.ADMIN_EDUCATION);
    return { ok: true };
  } catch (err) {
    if (err instanceof MarketplaceEducationForbiddenError) {
      return { ok: false, error: err.message };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось сохранить текст",
    };
  }
}
