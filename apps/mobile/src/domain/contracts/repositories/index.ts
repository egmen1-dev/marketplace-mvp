/**
 * EPIC 92 — Repository interfaces (ADR-002). No implementation. No transport.
 */

import type { Result } from "../result";
import type { LoginCredentials, Session, AccessToken } from "../entities/session";
import type { CatalogPage, CatalogQuery, Category, SearchSuggestion } from "../entities/catalog";
import type { Cart, FavoriteToggleResult, FavoritesSnapshot } from "../entities/cart";
import type { CheckoutForm, CheckoutResult, DeliveryQuote, DeliveryRequest, PickupPoint } from "../entities/checkout";
import type { OrderDetail, OrderSummary, SharePayload } from "../entities/order";
import type {
  SellerHomeDashboard,
  SellerOrderPage,
  SellerProductPage,
  SellerPublicProfile,
} from "../entities/seller";
import type { WalletBalance } from "../entities/wallet";
import type { FeedbackInput, RemoteConfig, UserProfile } from "../entities/profile";
import type { DomainEvent, DomainEventBus } from "../events";
import type { OrderId, ProductId, SellerId } from "../value-objects/ids";

export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<Result<Session>>;
  logout(): Promise<Result<void>>;
  restoreSession(): Promise<Result<Session | null>>;
  refreshToken(): Promise<Result<AccessToken>>;
  getSession(): Promise<Result<Session | null>>;
}

export interface CatalogRepository {
  loadCatalog(query: CatalogQuery): Promise<Result<CatalogPage>>;
  loadCategories(): Promise<Result<ReadonlyArray<Category>>>;
}

export interface SearchRepository {
  suggest(query: string): Promise<Result<ReadonlyArray<SearchSuggestion>>>;
  getHistory(): Promise<Result<ReadonlyArray<string>>>;
  pushHistory(query: string): Promise<Result<ReadonlyArray<string>>>;
  clearHistory(): Promise<Result<void>>;
}

export interface ProductRepository {
  loadProduct(productId: ProductId): Promise<Result<import("../entities/catalog").ProductDetail>>;
  loadRelated(productId: ProductId): Promise<Result<ReadonlyArray<import("../entities/catalog").ProductSummary>>>;
  recordRecentView(productId: ProductId): Promise<Result<void>>;
  getRecentViews(): Promise<Result<ReadonlyArray<import("../entities/catalog").ProductSummary>>>;
}

export interface FavoritesRepository {
  loadFavorites(): Promise<Result<FavoritesSnapshot>>;
  toggleFavorite(productId: ProductId): Promise<Result<FavoriteToggleResult>>;
  isFavorite(productId: ProductId): Promise<Result<boolean>>;
}

export interface CartRepository {
  loadCart(): Promise<Result<Cart>>;
  addItem(productId: ProductId, quantity: number): Promise<Result<Cart>>;
  updateQuantity(productId: ProductId, quantity: number): Promise<Result<Cart>>;
  removeItem(productId: ProductId): Promise<Result<Cart>>;
}

export interface CheckoutRepository {
  quoteDelivery(request: DeliveryRequest): Promise<Result<DeliveryQuote>>;
  loadPickupPoints(city: string): Promise<Result<ReadonlyArray<PickupPoint>>>;
  createOrder(form: CheckoutForm): Promise<Result<CheckoutResult>>;
}

export interface OrderRepository {
  loadOrders(): Promise<Result<ReadonlyArray<OrderSummary>>>;
  loadOrderDetail(orderId: OrderId): Promise<Result<OrderDetail>>;
  buildSharePayload(orderId: OrderId): Promise<Result<SharePayload>>;
}

export interface SellerRepository {
  loadSellerHome(): Promise<Result<SellerHomeDashboard>>;
  loadSellerProducts(params: {
    cursor?: string | null;
    query?: string | null;
    filter?: import("../entities/seller").SellerProductFilter;
    sort?: import("../entities/seller").SellerProductSort;
  }): Promise<Result<SellerProductPage>>;
  loadSellerProductsSummary(): Promise<Result<import("../entities/seller").SellerProductsSummary>>;
  loadSellerProductDetail(productId: ProductId): Promise<Result<import("../entities/seller").SellerProductDetail>>;
  loadSellerProductEditor(productId: ProductId | null): Promise<Result<import("../entities/seller").SellerProductEditor>>;
  saveSellerProduct(
    productId: ProductId | null,
    input: import("../entities/seller").SellerProductEditorInput,
  ): Promise<Result<import("../entities/seller").SellerProductEditorSaveResult>>;
  loadSellerCategories(): Promise<Result<ReadonlyArray<import("../entities/seller").SellerCategoryOption>>>;
  loadSellerTaxonomyBrowse(params: {
    categoryId?: string | null;
    productTypeId?: string | null;
  }): Promise<Result<import("../entities/seller").SellerTaxonomyBrowse>>;
  uploadSellerProductImage(
    localUri: string,
    fileName: string | null,
  ): Promise<Result<import("../entities/seller").SellerProductImageUploadResult>>;
  loadSellerOrders(params: {
    cursor?: string | null;
    query?: string | null;
    filter?: import("../entities/seller").SellerOrderFilter;
  }): Promise<Result<SellerOrderPage>>;
  loadSellerOrdersSummary(): Promise<Result<import("../entities/seller").SellerOrdersSummary>>;
  loadSellerOrderDetail(orderId: OrderId): Promise<Result<import("../entities/seller").SellerOrderDetail>>;
  loadPublicProfile(sellerId: SellerId): Promise<Result<SellerPublicProfile>>;
  executeAction(input: import("../entities/seller").SellerActionInput): Promise<Result<import("../entities/seller").SellerActionResult>>;
}

export interface WalletRepository {
  loadWallet(): Promise<Result<WalletBalance>>;
}

export interface ProfileRepository {
  loadProfile(): Promise<Result<UserProfile>>;
  submitFeedback(input: FeedbackInput): Promise<Result<void>>;
  setAppMode(mode: import("../entities/session").AppMode): Promise<Result<UserProfile>>;
}

export interface ConfigRepository {
  loadRemoteConfig(): Promise<Result<RemoteConfig>>;
  getFlag(key: string): Promise<Result<boolean>>;
}

export interface TelemetryRepository {
  track(event: DomainTelemetryEvent): Promise<Result<void>>;
}

export type DomainTelemetryEvent = {
  readonly name: string;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly errorCode?: string;
};

export interface CacheRepository {
  get<T>(key: string): Promise<Result<T | null>>;
  set<T>(key: string, value: T, ttlMs: number): Promise<Result<void>>;
  invalidate(keyOrPattern: string): Promise<Result<void>>;
  clear(): Promise<Result<void>>;
}

export interface DeepLinkRepository {
  parse(uri: string): Result<DeepLinkRoute | null>;
  resolve(route: DeepLinkRoute): NavigationTarget;
  queuePending(uri: string): Promise<Result<void>>;
  consumePending(): Promise<Result<string | null>>;
}

export type DeepLinkRoute = {
  readonly kind: string;
  readonly params: Readonly<Record<string, string>>;
};

export type NavigationTarget = {
  readonly pathname: string;
  readonly params?: Readonly<Record<string, string>>;
};


export type RepositoryRegistry = {
  readonly auth: AuthRepository;
  readonly catalog: CatalogRepository;
  readonly search: SearchRepository;
  readonly product: ProductRepository;
  readonly favorites: FavoritesRepository;
  readonly cart: CartRepository;
  readonly checkout: CheckoutRepository;
  readonly order: OrderRepository;
  readonly seller: SellerRepository;
  readonly wallet: WalletRepository;
  readonly profile: ProfileRepository;
  readonly config: ConfigRepository;
  readonly telemetry: TelemetryRepository;
  readonly cache: CacheRepository;
  readonly deepLink: DeepLinkRepository;
  readonly events: DomainEventBus;
};
