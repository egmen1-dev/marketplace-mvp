import type { ModerationStatus, ProductStatus } from "@prisma/client";

export type MobileSellerProductFilter =
  | "all"
  | "active"
  | "drafts"
  | "moderation"
  | "needs_fix"
  | "low_stock"
  | "out_of_stock"
  | "hidden";

export type MobileSellerProductSort =
  | "updated_desc"
  | "newest"
  | "oldest"
  | "stock_asc"
  | "stock_desc"
  | "price_asc"
  | "price_desc";

export type MobileSellerProductModeration = {
  status: ModerationStatus;
  reason: string | null;
  updatedAt: string;
};

export type MobileSellerProductItem = {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  compareAt: number | null;
  currency: string;
  stock: number;
  status: ProductStatus;
  views: number;
  favoritesCount: number;
  ordersCount: number;
  updatedAt: string;
  createdAt: string;
  primaryImage: { url: string } | null;
  moderation: MobileSellerProductModeration | null;
};

export type MobileSellerProductsSummary = {
  active: number;
  drafts: number;
  moderation: number;
  needsFix: number;
  outOfStock: number;
  lowStock: number;
  hidden: number;
};

export type MobileSellerProductDetail = MobileSellerProductItem & {
  description: string | null;
  categoryName: string | null;
  images: Array<{ url: string; isPrimary: boolean }>;
};

export type MobileSellerProductsPage = {
  items: MobileSellerProductItem[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
};

export const MOBILE_SELLER_PRODUCT_FILTERS: MobileSellerProductFilter[] = [
  "all",
  "active",
  "drafts",
  "moderation",
  "needs_fix",
  "low_stock",
  "out_of_stock",
  "hidden",
];

export const MOBILE_SELLER_PRODUCT_SORTS: MobileSellerProductSort[] = [
  "updated_desc",
  "newest",
  "oldest",
  "stock_asc",
  "stock_desc",
  "price_asc",
  "price_desc",
];
