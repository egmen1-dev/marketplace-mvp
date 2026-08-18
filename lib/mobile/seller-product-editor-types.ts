import type { ModerationStatus, ProductStatus } from "@prisma/client";

export type MobileSellerProductEditorImage = {
  url: string;
  alt?: string | null;
  pathname?: string | null;
  isPrimary: boolean;
};

export type MobileSellerProductEditorCharacteristic = {
  definitionId: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
  unit: string | null;
  options: string[] | null;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  displayValue?: string | null;
};

export type MobileSellerProductEditorModeration = {
  status: ModerationStatus;
  reason: string | null;
  issues: string[];
  qualityScore: number | null;
  updatedAt: string;
};

export type MobileSellerProductEditorPayload = {
  id: string | null;
  title: string;
  description: string | null;
  price: number;
  compareAt: number | null;
  currency: string;
  stock: number;
  sku: string | null;
  status: ProductStatus;
  categoryId: string | null;
  categoryName: string | null;
  productTypeId: string | null;
  productTypeName: string | null;
  images: MobileSellerProductEditorImage[];
  characteristics: MobileSellerProductEditorCharacteristic[];
  moderation: MobileSellerProductEditorModeration | null;
  previewAvailable: boolean;
  previewProductId: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

export type MobileSellerProductEditorInput = {
  title: string;
  description?: string | null;
  price: number;
  stock: number;
  sku?: string | null;
  categoryId?: string | null;
  productTypeId?: string | null;
  status?: ProductStatus;
  images?: MobileSellerProductEditorImage[];
  characteristics?: Array<{
    definitionId: string;
    valueText?: string | null;
    valueNumber?: number | null;
    valueBoolean?: boolean | null;
    valueJson?: unknown;
  }>;
};

export type MobileSellerCategoryOption = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  productCount: number;
  pathLabel?: string | null;
};

export type MobileSellerTaxonomyBrowse = {
  children: MobileSellerCategoryOption[];
  productTypes: Array<{
    id: string;
    name: string;
    slug: string;
    categoryId: string;
    breadcrumb: string[];
  }>;
  characteristics?: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    required: boolean;
    unit: string | null;
    options: string[] | null;
    sortOrder: number;
  }>;
};

export type MobileSellerProductEditorSaveResult = {
  id: string;
  status: ProductStatus;
  updatedAt: string;
  moderationPending?: boolean;
};
