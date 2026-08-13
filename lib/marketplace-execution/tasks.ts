import type { ActionPlanType, MarketplaceDiagnosis } from "@/lib/marketplace-operator/types";

import type {
  MarketplaceExecutionPlan,
  MarketplaceTask,
  MarketplaceTaskType,
  Priority,
  TaskOwner,
} from "./types";

function mapActionType(type: ActionPlanType): MarketplaceTaskType {
  const map: Record<ActionPlanType, MarketplaceTaskType> = {
    SELLER_OUTREACH: "SELLER_OUTREACH",
    PRODUCT_IMPROVEMENT: "PRODUCT_IMPROVEMENT",
    PROMOTION_LAUNCH: "PROMOTION_LAUNCH",
    CATEGORY_EXPANSION: "CATEGORY_EXPANSION",
    CONVERSION_FIX: "CONTENT_IMPROVEMENT",
    TRUST_BUILDING: "CONTENT_IMPROVEMENT",
  };
  return map[type];
}

function deadlineForPriority(priority: Priority): string {
  const days = priority === "HIGH" ? 7 : priority === "MEDIUM" ? 14 : 21;
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function expandActionToTasks(
  plan: MarketplaceExecutionPlan,
  diagnosis: MarketplaceDiagnosis | undefined,
  actionType: MarketplaceTaskType,
  actionDescription: string,
  startIndex: number,
): MarketplaceTask[] {
  const tasks: MarketplaceTask[] = [];
  const category = plan.category ?? "категории";
  const push = (
    offset: number,
    title: string,
    description: string,
    owner: TaskOwner = "ADMIN",
    href?: string,
  ) => {
    tasks.push({
      id: `${plan.id}-task-${startIndex + offset}`,
      planId: plan.id,
      type: actionType,
      title,
      description,
      owner,
      priority: plan.priority,
      status: "PENDING",
      impact: plan.goal,
      deadline: deadlineForPriority(plan.priority),
      href,
    });
  };

  if (actionType === "PRODUCT_IMPROVEMENT" || actionType === "CONTENT_IMPROVEMENT") {
    push(0, "Найти 50 товаров без фото", `Аудит карточек в ${category}`);
    push(1, "Связаться с продавцами", "Уведомить о проблемах карточек");
    push(
      2,
      "Предложить улучшение карточек",
      actionDescription,
      "SELLER",
    );
    if (diagnosis?.category === "Conversion") {
      push(3, "Проверить конверсию после правок", "Сравнить view→cart через 7 дней");
    }
    return tasks;
  }

  if (actionType === "SELLER_OUTREACH") {
    push(0, "Составить список целевых продавцов", `Категория ${category}`);
    push(1, "Пригласить продавцов", actionDescription);
    push(2, "Онбординг новых SKU", "Проверить качество первых карточек");
    return tasks;
  }

  if (actionType === "PROMOTION_LAUNCH") {
    push(0, "Отобрать SKU для продвижения", plan.goal);
    push(1, "Запустить продвижение", actionDescription, "SELLER");
    push(2, "Отследить promotion ROI", "Advisory review через 14 дней");
    return tasks;
  }

  if (actionType === "CATEGORY_EXPANSION") {
    push(
      0,
      "Расширить ассортимент категории",
      actionDescription,
      "ADMIN",
      "/admin/categories",
    );
    push(1, "Связать с demand gap", diagnosis?.issue ?? plan.goal);
    return tasks;
  }

  if (actionType === "BUYER_ACQUISITION") {
    push(0, "Подготовить кампанию спроса", actionDescription);
    return tasks;
  }

  push(0, actionDescription, plan.goal);
  return tasks;
}

/** AI task generation — how to execute operator recommendations. */
export function generateExecutionTasks(input: {
  plan: MarketplaceExecutionPlan;
  diagnosis: MarketplaceDiagnosis | undefined;
  actions: Array<{ type: ActionPlanType; description: string }>;
}): MarketplaceTask[] {
  const all: MarketplaceTask[] = [];
  let index = 0;

  for (const action of input.actions) {
    const taskType = mapActionType(action.type);
    const expanded = expandActionToTasks(
      input.plan,
      input.diagnosis,
      taskType,
      action.description,
      index,
    );
    all.push(...expanded);
    index += expanded.length;
  }

  if (
    input.diagnosis?.issue.toLowerCase().includes("конверс") ||
    input.diagnosis?.category === "Conversion"
  ) {
    const hasPhotoTask = all.some((t) => t.title.includes("без фото"));
    if (!hasPhotoTask) {
      all.unshift({
        id: `${input.plan.id}-task-conv-0`,
        planId: input.plan.id,
        type: "PRODUCT_IMPROVEMENT",
        title: "Найти 50 товаров без фото",
        description: "Низкая конверсия карточек — аудит визуала",
        owner: "ADMIN",
        priority: input.plan.priority,
        status: "PENDING",
        impact: input.plan.goal,
        deadline: deadlineForPriority(input.plan.priority),
      });
    }
  }

  return all.slice(0, 8);
}

export function generateAllExecutionTasks(input: {
  plans: MarketplaceExecutionPlan[];
  actionPlans: Array<{
    id: string;
    diagnosisId: string | null;
    actions: Array<{ type: ActionPlanType; description: string }>;
  }>;
  diagnoses: MarketplaceDiagnosis[];
}): Map<string, MarketplaceTask[]> {
  const map = new Map<string, MarketplaceTask[]>();

  for (const plan of input.plans) {
    const operatorPlanId = plan.id.replace(/^exec-/, "");
    const operatorPlan = input.actionPlans.find((p) => p.id === operatorPlanId);
    const diagnosis = input.diagnoses.find(
      (d) => d.id === operatorPlan?.diagnosisId,
    );
    const tasks = generateExecutionTasks({
      plan,
      diagnosis,
      actions: operatorPlan?.actions ?? [],
    });
    map.set(plan.id, tasks);
  }

  return map;
}
