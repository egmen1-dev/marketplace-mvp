"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/features/auth";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

import { isMarketplaceExecutionEnabled } from "./flags";
import {
  assertMarketplaceExecutionAccess,
  MarketplaceExecutionForbiddenError,
} from "./permissions";
import { EXECUTION_ENTITY_TYPE } from "./types";
import { assertTaskTransition } from "./workflows";

export type ExecutionTaskActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function persistTaskAction(input: {
  adminId: string;
  taskId: string;
  action: "TASK_STARTED" | "TASK_COMPLETED" | "TASK_CANCELLED";
  taskType?: string;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}): Promise<void> {
  await prisma.adminActionLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      entityType: EXECUTION_ENTITY_TYPE,
      entityId: input.taskId,
      meta: JSON.stringify({ status: input.status, taskType: input.taskType }),
    },
  });
}

export async function startExecutionTaskAction(
  taskId: string,
  taskType?: string,
): Promise<ExecutionTaskActionResult> {
  if (!isMarketplaceExecutionEnabled()) {
    return { ok: false, error: "Execution engine выключен" };
  }

  try {
    const admin = await requireAdminSession();
    assertMarketplaceExecutionAccess(admin.role);
    assertTaskTransition("PENDING", "IN_PROGRESS");

    await persistTaskAction({
      adminId: admin.id,
      taskId,
      action: "TASK_STARTED",
      taskType,
      status: "IN_PROGRESS",
    });

    await trackServerEvent({
      event: ANALYTICS_EVENTS.TASK_STARTED,
      route: ROUTES.ADMIN_EXECUTION,
      entityId: taskType ? `${taskType}:${taskId}` : taskId,
    });

    revalidatePath(ROUTES.ADMIN_EXECUTION);
    return { ok: true };
  } catch (err) {
    if (err instanceof MarketplaceExecutionForbiddenError) {
      return { ok: false, error: err.message };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось начать задачу",
    };
  }
}

export async function completeExecutionTaskAction(
  taskId: string,
  taskType?: string,
): Promise<ExecutionTaskActionResult> {
  if (!isMarketplaceExecutionEnabled()) {
    return { ok: false, error: "Execution engine выключен" };
  }

  try {
    const admin = await requireAdminSession();
    assertMarketplaceExecutionAccess(admin.role);
    assertTaskTransition("IN_PROGRESS", "COMPLETED");

    await persistTaskAction({
      adminId: admin.id,
      taskId,
      action: "TASK_COMPLETED",
      taskType,
      status: "COMPLETED",
    });

    await trackServerEvent({
      event: ANALYTICS_EVENTS.TASK_COMPLETED,
      route: ROUTES.ADMIN_EXECUTION,
      entityId: taskType ? `${taskType}:${taskId}` : taskId,
    });

    revalidatePath(ROUTES.ADMIN_EXECUTION);
    return { ok: true };
  } catch (err) {
    if (err instanceof MarketplaceExecutionForbiddenError) {
      return { ok: false, error: err.message };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось завершить задачу",
    };
  }
}

export async function completeExecutionTaskFromPendingAction(
  taskId: string,
  taskType?: string,
): Promise<ExecutionTaskActionResult> {
  const start = await startExecutionTaskAction(taskId, taskType);
  if (!start.ok) return start;
  return completeExecutionTaskAction(taskId, taskType);
}
