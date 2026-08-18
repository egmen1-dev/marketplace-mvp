import type { Money } from "../value-objects/money";
import type { CategoryId, ProductId, SellerId } from "../value-objects/ids";

export type ProductSummary = {
  readonly id: ProductId;
  readonly title: string;
  readonly price: Money;
  readonly compareAt: Money | null;
  readonly imageUrl: string | null;
  readonly sellerName: string | null;
  readonly sellerId: SellerId | null;
  readonly stock: number;
  readonly isFavorite: boolean;
  readonly favoritesCount: number;
  readonly city: string | null;
};

export type ProductDetail = ProductSummary & {
  readonly description: string | null;
  readonly specs: ReadonlyArray<{ label: string; value: string }>;
  readonly highlights: ReadonlyArray<string>;
  readonly gallery: ReadonlyArray<string>;
  readonly relatedProductIds: ReadonlyArray<ProductId>;
};

export type Category = {
  readonly id: CategoryId;
  readonly name: string;
  readonly slug: string | null;
};

export type CatalogQuery = {
  readonly q?: string;
  readonly cursor?: string | null;
  readonly sort?: "popular" | "newest" | "price_asc" | "price_desc";
  readonly sellerId?: SellerId;
  readonly categoryId?: CategoryId;
  readonly inStock?: boolean;
};

export type CatalogPage = {
  readonly items: ReadonlyArray<ProductSummary>;
  readonly nextCursor: string | null;
  readonly fromCache: boolean;
};

export type SearchSuggestion = {
  readonly text: string;
  readonly source: "history" | "popular" | "api";
};
