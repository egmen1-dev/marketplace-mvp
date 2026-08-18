/**
 * EPIC 92 — Use case base contract (ADR-003).
 */

import type { DomainError } from "../errors";
import type { Result } from "../result";

export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput, DomainError>>;
}

export type NoInput = Record<string, never>;

export interface CommandUseCase<TInput, TOutput> extends UseCase<TInput, TOutput> {}

export interface QueryUseCase<TInput, TOutput> extends UseCase<TInput, TOutput> {}

/** Frozen use case names — implementations in domain/use-cases/ (Sprint 93+). */
export type UseCaseName =
  | "LoginUser"
  | "LogoutUser"
  | "RestoreSession"
  | "RunStartupBootstrap"
  | "LoadBuyerHome"
  | "SearchProducts"
  | "LoadCatalog"
  | "LoadCategories"
  | "LoadProduct"
  | "LoadRelatedProducts"
  | "ShareProduct"
  | "ToggleFavorite"
  | "LoadFavorites"
  | "AddToCart"
  | "UpdateCartQuantity"
  | "RemoveFromCart"
  | "LoadCart"
  | "QuoteCheckoutDelivery"
  | "LoadPickupPoints"
  | "CreateOrder"
  | "LoadOrders"
  | "LoadOrderDetail"
  | "ShareOrder"
  | "LoadWallet"
  | "LoadSellerHome"
  | "LoadSellerProducts"
  | "LoadSellerOrders"
  | "LoadSellerPublicProfile"
  | "LoadProfile"
  | "SubmitProductFeedback"
  | "SwitchAppMode"
  | "HandleDeepLink"
  | "TrackDomainEvent"
  | "LoadRemoteConfig"
  | "RefreshTabBadges";
