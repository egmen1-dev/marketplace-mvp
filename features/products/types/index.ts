/**
 * Product DTOs and filter types.
 *
 * Price convention:
 * - Stored in Postgres as `Decimal(12, 2)` major currency units (rubles),
 *   e.g. 4990.00 = 4 990 ₽. Fractional part = kopecks.
 * - API/JSON exposes `price` as a number (float) for convenience.
 * - UI formats via `formatPrice()` — never display raw Decimal strings.
 *
 * Naming:
 * - Prisma field is `name`; public DTOs expose it as `title` (marketplace domain).
 * - `sellerId` on Product references `SellerProfile.id` (not User.id).
 */

import type { ProductCondition, ProductStatus, SellerKind } from "@prisma/client";

export type ProductImageDto = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type ProductCategoryDto = {
  id: string;
  name: string;
  slug: string;
};

export type ProductSellerDto = {
  id: string;
  storeName: string;
  slug: string;
  isVerified: boolean;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

/** Public sort keys for catalog / GET /api/products. */
export type ProductSort =
  | "popular"
  | "newest"
  | "price_asc"
  | "price_desc";

/** List/card representation of a product. */
export type ProductListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  /** Major RUB units (see file header). */
  price: number;
  compareAt: number | null;
  currency: string;
  stock: number;
  city: string | null;
  condition: ProductCondition;
  status: ProductStatus;
  views: number;
  favoritesCount: number;
  createdAt: string;
  category: ProductCategoryDto | null;
  primaryImage: ProductImageDto | null;
  seller: Pick<ProductSellerDto, "id" | "storeName" | "slug">;
};

/** Full product detail for PDP / GET by id. */
export type ProductDetail = ProductListItem & {
  images: ProductImageDto[];
  sku: string | null;
  weight: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seller: ProductSellerDto;
};

export type ProductListFilters = {
  /** Filter by category slug (preferred for catalog URLs). Includes descendants. */
  category?: string;
  categoryId?: string;
  sellerId?: string;
  /** SellerProfile slug (shareable catalog URLs). */
  seller?: string;
  /** Filter by SellerProfile.kind (SHOP | INDIVIDUAL). */
  sellerKind?: SellerKind;
  /** Defaults to ACTIVE for public listings. */
  status?: ProductStatus | "ALL";
  query?: string;
  /** Case-insensitive city contains (or exact when short). */
  city?: string;
  condition?: ProductCondition;
  priceMin?: number;
  priceMax?: number;
  /** When true, only products with stock > 0. */
  inStock?: boolean;
  sort?: ProductSort;
  page?: number;
  /** Alias for pageSize; also accepts `limit` from query string. */
  pageSize?: number;
  limit?: number;
  offset?: number;
};

export type ProductSuggestItem = {
  type: "product" | "category";
  id: string;
  title: string;
  slug: string;
  href: string;
};

export type ProductListResult = {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
