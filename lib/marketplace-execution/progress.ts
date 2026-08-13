import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { prisma } from "@/lib/prisma";

import type { ExecutionProgress, MarketplaceTask } from "./types";
import { EXECUTION_ENTITY_TYPE } from "./types";

type TaskStatusSnapshot = {
  taskId: string;
  status: MarketplaceTask["status"];
};

async function loadTaskStatusSnapshots(): Promise<TaskStatusSnapshot[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.adminActionLog.findMany({
    where: {
      entityType: EXECUTION_ENTITY_TYPE,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { entityId: true, action: true, meta: true },
  });

  const latest = new Map<string, TaskStatusSnapshot>();
  for (const row of rows) {
    if (latest.has(row.entityId)) continue;
    let status: MarketplaceTask["status"] = "PENDING";
    if (row.action === "TASK_COMPLETED") status = "COMPLETED";
    else if (row.action === "TASK_STARTED") status = "IN_PROGRESS";
    else if (row.action === "TASK_CANCELLED") status = "CANCELLED";
    else if (row.meta) {
      try {
        const parsed = JSON.parse(row.meta) as { status?: MarketplaceTask["status"] };
        if (parsed.status) status = parsed.status;
      } catch {
        /* ignore */
      }
    }
    latest.set(row.entityId, { taskId: row.entityId, status });
  }
  return [...latest.values()];
}

/** Apply persisted human status onto generated tasks. */
export function applyTaskStatuses(
  tasks: MarketplaceTask[],
  snapshots: TaskStatusSnapshot[],
): MarketplaceTask[] {
  const byId = new Map(snapshots.map((s) => [s.taskId, s.status]));
  return tasks.map((t) => ({
    ...t,
    status: byId.get(t.id) ?? t.status,
  }));
}

async function loadWeekCompletionCounts(): Promise<Record<string, number>> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await prisma.analyticsEvent.findMany({
    where: {
      event: ANALYTICS_EVENTS.TASK_COMPLETED,
      createdAt: { gte: since },
    },
    select: { entityId: true },
  });

  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = row.entityId?.split(":")[0] ?? "OTHER";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Compute execution progress and weekly impact summary. */
export async function calculateExecutionProgress(
  tasks: MarketplaceTask[],
  impactScore: number,
): Promise<ExecutionProgress> {
  const tasksTotal = tasks.length;
  const tasksCompleted = tasks.filter((t) => t.status === "COMPLETED").length;
  const tasksInProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const completionRate =
    tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 1000) / 10 : 0;

  const weekCounts = await loadWeekCompletionCounts();
  const weekSummary: string[] = [];

  const productDone = weekCounts.PRODUCT_IMPROVEMENT ?? 0;
  const sellerDone = weekCounts.SELLER_OUTREACH ?? 0;
  const promoDone = weekCounts.PROMOTION_LAUNCH ?? 0;

  if (productDone > 0) {
    weekSummary.push(`улучшено ${productDone * 10} карточек (advisory)`);
  }
  if (sellerDone > 0) {
    weekSummary.push(`привлечено ${sellerDone} продавцов (advisory)`);
  }
  if (promoDone > 0) {
    weekSummary.push(`запущено ${promoDone} продвижений (advisory)`);
  }
  if (weekSummary.length === 0) {
    weekSummary.push("На этой неделе задачи ещё не отмечены как выполненные");
  }

  return {
    tasksTotal,
    tasksCompleted,
    tasksInProgress,
    impactScore,
    completionRate,
    weekSummary,
  };
}

export async function loadPersistedTaskStatuses(): Promise<TaskStatusSnapshot[]> {
  return loadTaskStatusSnapshots();
}
