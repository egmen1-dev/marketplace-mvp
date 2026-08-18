/**
 * EPIC 92 — Domain events (ADR-009). Payloads frozen — amend via ADR.
 */

import type { Cart } from "./entities/cart";
import type { OrderSummary } from "./entities/order";
import type { Session } from "./entities/session";
import type { SellerOrderSummary } from "./entities/seller";
import type { UserProfile } from "./entities/profile";
import type { WalletBalance } from "./entities/wallet";
import type { ProductId } from "./value-objects/ids";

/** Emitted when cart lines or totals change (add, update qty, remove). */
export type CartUpdatedEvent = {
  readonly type: "CartUpdated";
  readonly cart: Cart;
  readonly changedProductId?: ProductId;
};

/** Emitted after successful checkout / order placement. */
export type OrderCreatedEvent = {
  readonly type: "OrderCreated";
  readonly orderId: string;
  readonly orderNumber?: string;
};

/** Emitted when user favorites or unfavorites a product. */
export type FavoriteChangedEvent = {
  readonly type: "FavoriteChanged";
  readonly productId: ProductId;
  readonly isFavorite: boolean;
  readonly favoritesCount?: number;
};

/** Emitted when seller-facing order list changes. */
export type SellerOrderChangedEvent = {
  readonly type: "SellerOrderChanged";
  readonly order: SellerOrderSummary;
  readonly change: "created" | "updated" | "status_changed";
};

/** Emitted when wallet balances refresh. */
export type WalletChangedEvent = {
  readonly type: "WalletChanged";
  readonly balance: WalletBalance;
};

/** Emitted when session ends or refresh fails permanently. */
export type SessionExpiredEvent = {
  readonly type: "SessionExpired";
  readonly reason: "token_expired" | "refresh_revoked" | "logout";
  readonly previousSession?: Session;
};

/** Emitted when profile or app mode changes. */
export type ProfileUpdatedEvent = {
  readonly type: "ProfileUpdated";
  readonly profile: UserProfile;
};

/** Emitted when connectivity changes (from ConnectivityStore). */
export type ConnectivityChangedEvent = {
  readonly type: "ConnectivityChanged";
  readonly offline: boolean;
  readonly changedAt: string;
};

/** Emitted when catalog cache invalidates. */
export type CatalogInvalidatedEvent = {
  readonly type: "CatalogInvalidated";
  readonly scope: "all" | "query" | "category";
  readonly queryHash?: string;
};

export type DomainEvent =
  | CartUpdatedEvent
  | OrderCreatedEvent
  | FavoriteChangedEvent
  | SellerOrderChangedEvent
  | WalletChangedEvent
  | SessionExpiredEvent
  | ProfileUpdatedEvent
  | ConnectivityChangedEvent
  | CatalogInvalidatedEvent;

export type DomainEventType = DomainEvent["type"];

export interface DomainEventBus {
  publish(event: DomainEvent): void;
  subscribe<T extends DomainEventType>(
    type: T,
    handler: (event: Extract<DomainEvent, { type: T }>) => void,
  ): () => void;
}
