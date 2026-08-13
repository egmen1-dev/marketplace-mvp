"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardCheck, ListTodo, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  completeExecutionTaskFromPendingAction,
  startExecutionTaskAction,
} from "@/lib/marketplace-execution/actions";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";
import type { MarketplaceExecutionDashboard } from "@/lib/marketplace-execution/types";
import { planStatusLabel, workflowLabel } from "@/lib/marketplace-execution/workflows";

type AdminMarketplaceExecutionPanelProps = {
  data: MarketplaceExecutionDashboard;
};

function priorityVariant(priority: string) {
  if (priority === "HIGH") return "destructive";
  if (priority === "MEDIUM") return "secondary";
  return "outline";
}

export function AdminMarketplaceExecutionPanel({
  data,
}: AdminMarketplaceExecutionPanelProps) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!data.enabled) return;
    trackEvent({
      event: ANALYTICS_EVENTS.EXECUTION_VIEW,
      route: ROUTES.ADMIN_EXECUTION,
    });
    if (data.activePlans.length > 0) {
      trackEvent({
        event: ANALYTICS_EVENTS.EXECUTION_PLAN_CREATED,
        route: ROUTES.ADMIN_EXECUTION,
        entityId: String(data.activePlans.length),
      });
    }
  }, [data.enabled, data.activePlans.length]);

  if (!data.enabled) {
    return (
      <Card data-testid="admin-marketplace-execution-panel">
        <CardHeader>
          <CardTitle>Marketplace Execution выключен</CardTitle>
          <CardDescription>
            MARKETPLACE_EXECUTION_ENABLED=false
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  function runTask(
    taskId: string,
    taskType: string,
    mode: "start" | "complete",
  ) {
    startTransition(async () => {
      const result =
        mode === "start"
          ? await startExecutionTaskAction(taskId, taskType)
          : await completeExecutionTaskFromPendingAction(taskId, taskType);
      if (!result.ok && result.error) {
        window.alert(result.error);
      }
    });
  }

  return (
    <div
      className="flex flex-col gap-6"
      data-testid="admin-marketplace-execution-panel"
    >
      <section data-testid="execution-progress">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Impact Tracking</CardTitle>
            <CardDescription>
              Completion {data.progress.completionRate}% · Impact score{" "}
              {data.progress.impactScore}/100
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">На этой неделе:</p>
            <ul className="mt-1 list-inside list-disc text-muted-foreground">
              {data.progress.weekSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section data-testid="execution-active-plans">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardCheck className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">
            Active Growth Plans
          </h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.activePlans.map((plan) => (
            <Card key={plan.id} data-testid={`execution-plan-${plan.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{plan.title}</CardTitle>
                  <Badge variant={priorityVariant(plan.priority)}>
                    {planStatusLabel(plan.status)}
                  </Badge>
                </div>
                <CardDescription>{plan.goal}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {plan.tasks.length} задач · impact {plan.impactScore}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section data-testid="execution-todays-priorities">
        <div className="mb-3 flex items-center gap-2">
          <ListTodo className="size-5 text-primary" aria-hidden />
          <h3 className="font-heading text-lg font-semibold">
            Today&apos;s Priorities
          </h3>
        </div>
        <ul className="space-y-2">
          {data.todaysPriorities.map((task) => (
            <li
              key={task.id}
              className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              data-testid={`execution-task-${task.id}`}
            >
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-muted-foreground">
                  {task.description} · {workflowLabel(task.status)}
                </p>
              </div>
              <div className="flex gap-2">
                {task.status === "PENDING" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => runTask(task.id, task.type, "start")}
                  >
                    <Play className="size-3.5" aria-hidden />
                    Начать
                  </Button>
                ) : null}
                {task.status !== "COMPLETED" ? (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => runTask(task.id, task.type, "complete")}
                  >
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    Выполнено
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="execution-task-pipeline">
        <h3 className="mb-3 font-heading text-lg font-semibold">Task Pipeline</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {data.taskPipeline.slice(0, 12).map((task) => (
            <li key={task.id}>
              [{task.type}] {task.title} — {workflowLabel(task.status)}
              {task.href ? (
                <>
                  {" · "}
                  <Link href={task.href} className="text-primary hover:underline">
                    открыть
                  </Link>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {data.completedTasks.length > 0 ? (
        <section data-testid="execution-completed-actions">
          <h3 className="mb-3 font-heading text-lg font-semibold">
            Completed Actions
          </h3>
          <ul className="space-y-1 text-sm">
            {data.completedTasks.map((task) => (
              <li key={task.id} className="text-muted-foreground">
                ✓ {task.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Operator → Execution: изменения только после подтверждения человека.{" "}
        <Link href={ROUTES.ADMIN_OPERATOR} className="text-primary hover:underline">
          Operator dashboard
        </Link>
      </p>
    </div>
  );
}
