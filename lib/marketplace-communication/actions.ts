"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/features/auth";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

import { isMarketplaceCommunicationEnabled } from "./flags";
import {
  assertMarketplaceCommunicationAccess,
  MarketplaceCommunicationForbiddenError,
} from "./permissions";
import { COMMUNICATION_ENTITY_TYPE } from "./types";

export type CommunicationActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function logCommunicationAction(input: {
  adminId: string;
  messageId: string;
  action: string;
  meta?: Record<string, string>;
}): Promise<void> {
  await prisma.adminActionLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      entityType: COMMUNICATION_ENTITY_TYPE,
      entityId: input.messageId,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
  });
}

export async function approveCommunicationMessageAction(
  messageId: string,
): Promise<CommunicationActionResult> {
  if (!isMarketplaceCommunicationEnabled()) {
    return { ok: false, error: "Communication engine выключен" };
  }

  try {
    const admin = await requireAdminSession();
    assertMarketplaceCommunicationAccess(admin.role);

    await logCommunicationAction({
      adminId: admin.id,
      messageId,
      action: "MESSAGE_APPROVED",
    });

    await trackServerEvent({
      event: ANALYTICS_EVENTS.COMMUNICATION_MESSAGE_APPROVED,
      route: ROUTES.ADMIN_COMMUNICATION,
      entityId: messageId,
    });

    revalidatePath(ROUTES.ADMIN_COMMUNICATION);
    return { ok: true };
  } catch (err) {
    if (err instanceof MarketplaceCommunicationForbiddenError) {
      return { ok: false, error: err.message };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось одобрить",
    };
  }
}

/** Records send intent — does NOT dispatch email/push (human channel later). */
export async function sendCommunicationMessageAction(
  messageId: string,
): Promise<CommunicationActionResult> {
  if (!isMarketplaceCommunicationEnabled()) {
    return { ok: false, error: "Communication engine выключен" };
  }

  try {
    const admin = await requireAdminSession();
    assertMarketplaceCommunicationAccess(admin.role);

    await logCommunicationAction({
      adminId: admin.id,
      messageId,
      action: "MESSAGE_SENT",
      meta: { channel: "IN_APP" },
    });

    await trackServerEvent({
      event: ANALYTICS_EVENTS.COMMUNICATION_MESSAGE_SENT,
      route: ROUTES.ADMIN_COMMUNICATION,
      entityId: messageId,
    });

    revalidatePath(ROUTES.ADMIN_COMMUNICATION);
    return { ok: true };
  } catch (err) {
    if (err instanceof MarketplaceCommunicationForbiddenError) {
      return { ok: false, error: err.message };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось отправить",
    };
  }
}

export async function approveAndSendCommunicationMessageAction(
  messageId: string,
): Promise<CommunicationActionResult> {
  const approved = await approveCommunicationMessageAction(messageId);
  if (!approved.ok) return approved;
  return sendCommunicationMessageAction(messageId);
}
