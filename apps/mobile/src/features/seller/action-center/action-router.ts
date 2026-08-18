import type { SellerActionKind } from "../../../domain/contracts/entities/seller";
import type { SellerWorkspaceItemView } from "../seller-view";

export type ActionSheetMode = "form" | "confirm" | "open_url";

export interface ActionSheetConfig {
  mode: ActionSheetMode;
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel?: string;
  fields?: ActionFormField[];
}

export interface ActionFormField {
  key: string;
  label: string;
  placeholder: string;
  keyboardType?: "default" | "numeric";
  defaultValue?: string;
  multiline?: boolean;
}

export const SELLER_ACTION_LABELS: Record<SellerActionKind, string> = {
  update_stock: "Обновить остаток",
  publish_product: "Опубликовать",
  fix_moderation: "Исправить",
  ship_order: "Отметить отправку",
  confirm_order: "Подтвердить",
  reply_buyer: "Ответить",
  withdraw_funds: "Вывести",
  complete_profile: "Заполнить профиль",
  resume_draft: "Продолжить",
  hide_product: "Скрыть",
  move_to_draft: "В черновики",
  duplicate_product: "Дублировать",
  delete_product: "Удалить",
};

export function resolveActionSheet(task: SellerWorkspaceItemView): ActionSheetConfig | null {
  const kind = task.actionKind;
  if (!kind) return null;

  switch (kind) {
    case "update_stock":
      return {
        mode: "form",
        title: "Обновить остаток",
        subtitle: task.title,
        primaryLabel: "Сохранить",
        fields: [
          {
            key: "quantity",
            label: "Количество на складе",
            placeholder: "0",
            keyboardType: "numeric",
            defaultValue: String(
              task.actionPayload?.quantity ?? task.actionPayload?.previousQuantity ?? "",
            ),
          },
        ],
      };
    case "publish_product":
      return {
        mode: "confirm",
        title: "Опубликовать товар",
        subtitle: task.subtitle ?? task.title,
        primaryLabel: "Опубликовать",
      };
    case "ship_order":
      return {
        mode: "confirm",
        title: "Отметить отправку",
        subtitle: task.subtitle ?? task.title,
        primaryLabel: "Подтвердить отправку",
      };
    case "confirm_order":
      return {
        mode: "confirm",
        title: "Подтвердить заказ",
        subtitle: task.subtitle ?? task.title,
        primaryLabel: "Подтвердить",
      };
    case "reply_buyer":
      return {
        mode: "open_url",
        title: "Ответ покупателю",
        subtitle: task.subtitle ?? task.title,
        primaryLabel: "Открыть чат",
      };
    case "withdraw_funds":
      return {
        mode: "confirm",
        title: "Вывод средств",
        subtitle: task.subtitle ?? task.title,
        primaryLabel: "Создать заявку",
      };
    case "complete_profile":
      return {
        mode: "form",
        title: "Заполнить профиль",
        subtitle: "Укажите недостающие данные магазина",
        primaryLabel: "Сохранить",
        fields: [
          {
            key: "storeName",
            label: "Название магазина",
            placeholder: "Мой магазин",
            defaultValue: String(task.actionPayload?.storeName ?? ""),
          },
          {
            key: "phone",
            label: "Телефон",
            placeholder: "+7…",
            defaultValue: String(task.actionPayload?.phone ?? ""),
          },
        ],
      };
    case "resume_draft":
    case "fix_moderation":
      return {
        mode: "open_url",
        title: kind === "fix_moderation" ? "Исправить модерацию" : "Продолжить черновик",
        subtitle: task.subtitle ?? task.title,
        primaryLabel: "Открыть редактор",
      };
    case "hide_product":
      return {
        mode: "confirm",
        title: "Скрыть товар",
        subtitle: task.subtitle ?? task.title,
        primaryLabel: "Скрыть",
      };
    case "move_to_draft":
      return {
        mode: "confirm",
        title: "Перевести в черновики",
        subtitle: task.subtitle ?? task.title,
        primaryLabel: "В черновики",
      };
    case "duplicate_product":
      return {
        mode: "confirm",
        title: "Дублировать товар",
        subtitle: task.subtitle ?? task.title,
        primaryLabel: "Создать копию",
      };
    case "delete_product":
      return {
        mode: "confirm",
        title: "Удалить товар",
        subtitle: "Действие необратимо, если товар не использовался в заказах",
        primaryLabel: "Удалить",
      };
    default:
      return null;
  }
}

export function buildActionPayload(
  task: SellerWorkspaceItemView,
  formValues: Record<string, string>,
): Record<string, string | number | boolean | null> {
  const base = { ...(task.actionPayload ?? {}) };
  const kind = task.actionKind as SellerActionKind;

  switch (kind) {
    case "update_stock": {
      const quantity = parseInt(formValues.quantity ?? "0", 10);
      return { ...base, quantity: Number.isFinite(quantity) ? quantity : 0 };
    }
    case "reply_buyer":
      return base;
    case "complete_profile":
      return {
        ...base,
        storeName: formValues.storeName?.trim() ?? null,
        phone: formValues.phone?.trim() ?? null,
      };
    default:
      return base;
  }
}

export function priorityToCardTone(
  priority: SellerWorkspaceItemView["priority"],
): "critical" | "high" | "medium" | "low" {
  if (priority === "urgent") return "critical";
  if (priority === "important") return "high";
  if (priority === "completed") return "low";
  return "medium";
}
