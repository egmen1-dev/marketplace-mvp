import type { Money } from "../value-objects/money";
import type { ProductId, SellerId } from "../value-objects/ids";

export type CartLine = {
  readonly productId: ProductId;
  readonly title: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly lineTotal: Money;
  readonly imageUrl: string | null;
  readonly sellerId: SellerId | null;
  readonly stock: number;
};

export type Cart = {
  readonly lines: ReadonlyArray<CartLine>;
  readonly itemCount: number;
  readonly subtotal: Money;
  readonly savings: Money;
  readonly updatedAt: string;
};

export type FavoriteToggleResult = {
  readonly productId: ProductId;
  readonly isFavorite: boolean;
  readonly favoritesCount?: number;
};

export type FavoritesSnapshot = {
  readonly items: ReadonlyArray<import("./catalog").ProductSummary>;
  readonly updatedAt: string;
};
