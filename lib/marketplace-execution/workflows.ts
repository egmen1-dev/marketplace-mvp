import type { TaskStatus } from "./types";

const ALLOWED: Record<TaskStatus, TaskStatus[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export class InvalidTaskTransitionError extends Error {
  constructor(from: TaskStatus, to: TaskStatus) {
    super(`Invalid task transition: ${from} → ${to}`);
    this.name = "InvalidTaskTransitionError";
  }
}

/** Validate human-driven task lifecycle transitions. */
export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!ALLOWED[from].includes(to)) {
    throw new InvalidTaskTransitionError(from, to);
  }
}

export function workflowLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    PENDING: "Ожидает",
    IN_PROGRESS: "В работе",
    COMPLETED: "Выполнено",
    CANCELLED: "Отменено",
  };
  return map[status];
}

export function planStatusLabel(
  status: import("./types").ExecutionPlanStatus,
): string {
  const map: Record<import("./types").ExecutionPlanStatus, string> = {
    DRAFT: "Черновик",
    ACTIVE: "Активен",
    PAUSED: "Пауза",
    COMPLETED: "Завершён",
    ARCHIVED: "Архив",
  };
  return map[status];
}
