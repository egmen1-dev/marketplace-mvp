import type { SellerProduct, SellerProductDetail, SellerProductsSummary, SellerProductFilter, SellerProductSort } from "../../../domain/contracts/entities/seller";

export type SellerOperationalProductView = {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  compareAt: number | null;
  stock: number;
  status: string;
  statusLabel: string;
  statusTone: "neutral" | "success" | "warning" | "danger";
  moderationStatus: string | null;
  moderationReason: string | null;
  moderationUpdatedAt: string | null;
  views: number;
  ordersCount: number;
  updatedAt: string;
  imageUrl: string | null;
  isLowStock: boolean;
  isDraft: boolean;
  isModeration: boolean;
};

export type SellerProductsSummaryView = SellerProductsSummary;

export type SellerProductDetailView = SellerOperationalProductView & {
  description: string | null;
  categoryName: string | null;
  images: ReadonlyArray<{ url: string; isPrimary: boolean }>;
  favoritesCount: number;
  createdAt: string;
};

export const SELLER_PRODUCT_FILTER_LABELS: Record<SellerProductFilter, string> = {
  all: "Все",
  active: "Активные",
  drafts: "Черновики",
  moderation: "Модерация",
  needs_fix: "Нужны правки",
  low_stock: "Низкий остаток",
  out_of_stock: "Нет в наличии",
  hidden: "Скрытые",
};

export const SELLER_PRODUCT_SORT_LABELS: Record<SellerProductSort, string> = {
  updated_desc: "Недавно обновлённые",
  newest: "Сначала новые",
  oldest: "Сначала старые",
  stock_asc: "Остаток ↑",
  stock_desc: "Остаток ↓",
  price_asc: "Цена ↑",
  price_desc: "Цена ↓",
};

export const SELLER_PRODUCT_SUMMARY_KEYS: Array<{
  key: keyof SellerProductsSummary;
  filter: SellerProductFilter;
  label: string;
}> = [
  { key: "active", filter: "active", label: "Активные" },
  { key: "drafts", filter: "drafts", label: "Черновики" },
  { key: "moderation", filter: "moderation", label: "Модерация" },
  { key: "needsFix", filter: "needs_fix", label: "Нужны правки" },
  { key: "outOfStock", filter: "out_of_stock", label: "Нет в наличии" },
  { key: "lowStock", filter: "low_stock", label: "Низкий остаток" },
  { key: "hidden", filter: "hidden", label: "Скрытые" },
];

const LOW_STOCK_THRESHOLD = 5;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активен",
  DRAFT: "Черновик",
  ARCHIVED: "Скрыт",
  OUT_OF_STOCK: "Нет в наличии",
};

const MODERATION_LABELS: Record<string, string> = {
  PENDING_REVIEW: "На модерации",
  NEEDS_FIX: "Нужны правки",
  REJECTED: "Отклонён",
  APPROVED: "Одобрен",
};

function statusTone(status: string, stock: number): SellerOperationalProductView["statusTone"] {
  if (status === "DRAFT") return "warning";
  if (status === "ARCHIVED") return "neutral";
  if (status === "OUT_OF_STOCK" || stock <= 0) return "danger";
  if (stock > 0 && stock <= LOW_STOCK_THRESHOLD) return "warning";
  return "success";
}

export function sellerProductToOperationalView(product: SellerProduct): SellerOperationalProductView {
  const moderationStatus = product.moderation?.status ?? null;
  return {
    id: product.id,
    title: product.title,
    sku: product.sku,
    price: product.price.amount,
    compareAt: product.compareAt?.amount ?? null,
    stock: product.stock,
    status: product.status,
    statusLabel: STATUS_LABELS[product.status] ?? product.status,
    statusTone: statusTone(product.status, product.stock),
    moderationStatus: moderationStatus ? (MODERATION_LABELS[moderationStatus] ?? moderationStatus) : null,
    moderationReason: product.moderation?.reason ?? null,
    moderationUpdatedAt: product.moderation?.updatedAt ?? null,
    views: product.views,
    ordersCount: product.ordersCount,
    updatedAt: product.updatedAt,
    imageUrl: product.imageUrl,
    isLowStock: product.status === "ACTIVE" && product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD,
    isDraft: product.status === "DRAFT",
    isModeration: Boolean(moderationStatus && moderationStatus !== "APPROVED"),
  };
}

export function sellerProductDetailToView(detail: SellerProductDetail): SellerProductDetailView {
  const base = sellerProductToOperationalView(detail);
  return {
    ...base,
    description: detail.description,
    categoryName: detail.categoryName,
    images: detail.images,
    favoritesCount: detail.favoritesCount,
    createdAt: detail.createdAt,
  };
}

export function productToActionTask(
  product: SellerOperationalProductView,
  actionKind: import("../../../domain/contracts/entities/seller").SellerActionKind,
): import("../seller-view").SellerWorkspaceItemView {
  return {
    id: `${product.id}-${actionKind}`,
    title: product.title,
    subtitle: product.sku ? `SKU ${product.sku}` : `Остаток ${product.stock}`,
    priority: product.isLowStock ? "important" : "routine",
    source: "products",
    section: "todays_work",
    action: "products",
    entityId: product.id,
    resumeKey: `product:${product.id}`,
    completedAt: null,
    actionKind,
    actionPayload: {
      productId: product.id,
      quantity: Math.max(product.stock, LOW_STOCK_THRESHOLD + 1),
      previousQuantity: product.stock,
    },
    supportsUndo: ["update_stock", "publish_product", "hide_product", "move_to_draft"].includes(actionKind),
  };
}
