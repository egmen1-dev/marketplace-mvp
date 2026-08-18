import { useCallback, useState } from "react";
import { Linking } from "react-native";
import { getCommerceUseCases } from "../../../composition/commerce-container";
import type { SellerActionKind, SellerActionResult } from "../../../domain/contracts/entities/seller";
import { domainErrorMessage } from "../../../domain/errors/error-factory";
import type { SellerWorkspaceItemView } from "../seller-view";
import { buildActionPayload } from "./action-router";

export interface ActionResultState {
  visible: boolean;
  success: boolean;
  message: string;
  undo?: SellerActionResult["undo"];
  taskId?: string;
}

export interface UseSellerActionCenterOptions {
  onWorkspaceRefresh: () => Promise<void>;
  onTelemetry?: (event: string, payload?: Record<string, unknown>) => void;
}

export function useSellerActionCenter(options: UseSellerActionCenterOptions) {
  const { onWorkspaceRefresh, onTelemetry } = options;
  const [activeTask, setActiveTask] = useState<SellerWorkspaceItemView | null>(null);
  const [executing, setExecuting] = useState(false);
  const [optimisticHiddenIds, setOptimisticHiddenIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ActionResultState>({
    visible: false,
    success: false,
    message: "",
  });

  const openTask = useCallback(
    (task: SellerWorkspaceItemView) => {
      if (!task.actionKind) return;
      onTelemetry?.("seller_action_open", { taskId: task.id, actionKind: task.actionKind });
      setActiveTask(task);
    },
    [onTelemetry],
  );

  const closeSheet = useCallback(() => {
    if (executing) return;
    setActiveTask(null);
  }, [executing]);

  const execute = useCallback(
    async (formValues: Record<string, string> = {}) => {
      if (!activeTask?.actionKind) return;
      const task = activeTask;
      const action = task.actionKind as SellerActionKind;
      const payload = buildActionPayload(task, formValues);

      setExecuting(true);
      setOptimisticHiddenIds((prev) => new Set(prev).add(task.id));
      onTelemetry?.("seller_action_execute", { taskId: task.id, actionKind: action });

      try {
        const commerce = getCommerceUseCases();
        const apiResult = await commerce.executeSellerAction.execute({ action, payload });

        if (!apiResult.ok) {
          throw new Error(domainErrorMessage(apiResult.error));
        }

        const actionResult = apiResult.value;
        if (!actionResult.ok) {
          throw new Error(actionResult.message);
        }

        if (actionResult.openUrl) {
          setOptimisticHiddenIds((prev) => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
          setActiveTask(null);
          await Linking.openURL(actionResult.openUrl);
          onTelemetry?.("seller_action_open_url", { taskId: task.id, url: actionResult.openUrl });
          await onWorkspaceRefresh();
          return;
        }

        setActiveTask(null);
        setResult({
          visible: true,
          success: true,
          message: actionResult.message,
          undo: actionResult.undo,
          taskId: task.id,
        });
        onTelemetry?.("seller_action_success", { taskId: task.id, actionKind: action });
        onTelemetry?.("seller_task_completed", { taskId: task.id, actionKind: action });
        await onWorkspaceRefresh();
      } catch (error) {
        setOptimisticHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
        const message = error instanceof Error ? error.message : "Не удалось выполнить действие";
        setResult({ visible: true, success: false, message, taskId: task.id });
        onTelemetry?.("seller_action_failure", { taskId: task.id, actionKind: action, message });
      } finally {
        setExecuting(false);
      }
    },
    [activeTask, onTelemetry, onWorkspaceRefresh],
  );

  const dismissResult = useCallback(() => {
    setResult((prev) => ({ ...prev, visible: false }));
  }, []);

  const undo = useCallback(async () => {
    if (!result.undo) return;
    setExecuting(true);
    onTelemetry?.("seller_action_undo", { taskId: result.taskId });

    try {
      const commerce = getCommerceUseCases();
      const apiResult = await commerce.executeSellerAction.execute({
        action: result.undo.action,
        payload: result.undo.payload,
      });
      if (!apiResult.ok) throw new Error(domainErrorMessage(apiResult.error));
      if (!apiResult.value.ok) throw new Error(apiResult.value.message);

      setResult({ visible: false, success: false, message: "" });
      await onWorkspaceRefresh();
      onTelemetry?.("seller_action_undo_success", { taskId: result.taskId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось отменить";
      setResult((prev) => ({ ...prev, success: false, message }));
    } finally {
      setExecuting(false);
    }
  }, [result, onTelemetry, onWorkspaceRefresh]);

  const filterVisibleTasks = useCallback(
    (tasks: SellerWorkspaceItemView[]) => tasks.filter((t) => !optimisticHiddenIds.has(t.id)),
    [optimisticHiddenIds],
  );

  return {
    activeTask,
    executing,
    result,
    openTask,
    closeSheet,
    execute,
    dismissResult,
    undo,
    filterVisibleTasks,
  };
}
