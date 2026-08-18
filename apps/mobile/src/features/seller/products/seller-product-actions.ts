import type { SellerActionKind } from "../../../domain/contracts/entities/seller";
import type { SellerOperationalProductView } from "./seller-products-view";

export function resolveProductMenuActions(product: SellerOperationalProductView): SellerActionKind[] {
  const actions: SellerActionKind[] = ["update_stock"];

  if (product.status === "DRAFT") {
    actions.push("publish_product", "resume_draft", "delete_product");
    return actions;
  }

  if (product.isModeration) {
    actions.push("fix_moderation");
  }

  if (product.status === "ACTIVE") {
    actions.push("move_to_draft", "hide_product", "duplicate_product");
  }

  if (product.status === "ARCHIVED" || product.status === "OUT_OF_STOCK") {
    actions.push("move_to_draft", "delete_product");
  }

  return [...new Set(actions)];
}

export const PRODUCT_ACTION_LABELS: Partial<Record<SellerActionKind, string>> = {
  update_stock: "Обновить остаток",
  publish_product: "Опубликовать",
  resume_draft: "Продолжить редактирование",
  fix_moderation: "Исправить модерацию",
  hide_product: "Скрыть товар",
  move_to_draft: "В черновики",
  duplicate_product: "Дублировать",
  delete_product: "Удалить",
};
