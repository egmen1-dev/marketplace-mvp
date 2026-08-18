import type {
  SellerProductEditor,
  SellerProductEditorImage,
  SellerProductEditorInput,
} from "../../../domain/contracts/entities/seller";

export type SellerProductEditorForm = {
  title: string;
  description: string;
  price: string;
  stock: string;
  sku: string;
  categoryId: string | null;
  categoryName: string | null;
  productTypeId: string | null;
  productTypeName: string | null;
  status: string;
  visibility: "draft" | "published" | "hidden";
  images: SellerProductEditorImage[];
  characteristics: Array<{
    definitionId: string;
    name: string;
    required: boolean;
    type: string;
    unit: string | null;
    options: string[] | null;
    value: string;
  }>;
  compareAt: number | null;
  previewAvailable: boolean;
  previewProductId: string | null;
  moderation: SellerProductEditor["moderation"];
};

export type SellerProductEditorValidation = {
  ok: boolean;
  fieldErrors: Partial<Record<keyof SellerProductEditorForm | "images" | "characteristics", string>>;
  message: string | null;
};

export const VISIBILITY_LABELS = {
  draft: "Черновик",
  published: "Опубликован",
  hidden: "Скрыт",
} as const;

export function visibilityToStatus(visibility: SellerProductEditorForm["visibility"]): string {
  if (visibility === "published") return "ACTIVE";
  if (visibility === "hidden") return "ARCHIVED";
  return "DRAFT";
}

export function statusToVisibility(status: string): SellerProductEditorForm["visibility"] {
  if (status === "ACTIVE") return "published";
  if (status === "ARCHIVED") return "hidden";
  return "draft";
}

export function editorToForm(editor: SellerProductEditor): SellerProductEditorForm {
  return {
    title: editor.title,
    description: editor.description ?? "",
    price: editor.price > 0 ? String(editor.price) : "",
    stock: String(editor.stock ?? 0),
    sku: editor.sku ?? "",
    categoryId: editor.categoryId,
    categoryName: editor.categoryName,
    productTypeId: editor.productTypeId,
    productTypeName: editor.productTypeName,
    status: editor.status,
    visibility: statusToVisibility(editor.status),
    images: editor.images.map((img) => ({ ...img })),
    characteristics: editor.characteristics.map((c) => ({
      definitionId: c.definitionId,
      name: c.name,
      required: c.required,
      type: c.type,
      unit: c.unit,
      options: c.options ? [...c.options] : null,
      value: c.valueText ?? c.displayValue ?? "",
    })),
    compareAt: editor.compareAt,
    previewAvailable: editor.previewAvailable,
    previewProductId: editor.previewProductId,
    moderation: editor.moderation,
  };
}

export function validateEditorForm(form: SellerProductEditorForm): SellerProductEditorValidation {
  const fieldErrors: SellerProductEditorValidation["fieldErrors"] = {};
  const title = form.title.trim();
  if (title.length < 2) fieldErrors.title = "Минимум 2 символа";
  if (title.length > 200) fieldErrors.title = "Максимум 200 символов";

  const price = Number(form.price.replace(",", "."));
  if (!Number.isFinite(price) || price <= 0) fieldErrors.price = "Укажите цену больше 0";

  const stock = Number(form.stock);
  if (!Number.isFinite(stock) || stock < 0) fieldErrors.stock = "Остаток не может быть отрицательным";

  if (form.images.length === 0) fieldErrors.images = "Добавьте хотя бы одно фото";

  for (const characteristic of form.characteristics) {
    if (characteristic.required && !characteristic.value.trim()) {
      fieldErrors.characteristics = `Заполните «${characteristic.name}»`;
      break;
    }
  }

  const keys = Object.keys(fieldErrors);
  return {
    ok: keys.length === 0,
    fieldErrors,
    message: keys.length > 0 ? "Исправьте ошибки в форме" : null,
  };
}

export function formToEditorInput(form: SellerProductEditorForm, forceDraft = false): SellerProductEditorInput {
  const price = Number(form.price.replace(",", "."));
  const stock = Number(form.stock);
  return {
    title: form.title.trim(),
    description: form.description.trim() ? form.description.trim() : null,
    price,
    stock: Number.isFinite(stock) ? Math.floor(stock) : 0,
    sku: form.sku.trim() ? form.sku.trim() : null,
    categoryId: form.categoryId,
    productTypeId: form.productTypeId,
    status: forceDraft ? "DRAFT" : visibilityToStatus(form.visibility),
    images: form.images.map((img, index) => ({
      url: img.url,
      alt: img.alt ?? null,
      pathname: img.pathname ?? null,
      isPrimary: img.isPrimary ?? index === 0,
    })),
    characteristics: form.characteristics
      .filter((c) => c.value.trim())
      .map((c) => ({
        definitionId: c.definitionId,
        valueText: c.value.trim(),
      })),
  };
}

export function productToActionTaskFromEditor(
  productId: string,
  title: string,
  actionKind: import("../../../domain/contracts/entities/seller").SellerActionKind,
): import("../seller-view").SellerWorkspaceItemView {
  return {
    id: `${productId}-${actionKind}`,
    title,
    subtitle: "Публикация товара",
    priority: "important",
    source: "products",
    section: "pending_publications",
    action: "products",
    entityId: productId,
    resumeKey: `product:${productId}`,
    completedAt: null,
    actionKind,
    actionPayload: { productId },
    supportsUndo: actionKind === "publish_product",
  };
}
