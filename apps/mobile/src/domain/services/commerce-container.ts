/**
 * Sprint 94 — Composition root for commerce domain (hooks import from here).
 */

import { getDomainEventBus } from "../events/domain-event-bus";
import { LoginUser, LogoutUser } from "../use-cases/auth/auth-use-cases";
import { LoadCatalog, LoadCategories } from "../use-cases/catalog/load-catalog";
import { SearchProducts } from "../use-cases/catalog/search-products";
import {
  LoadCatalogPage,
  LoadProductDetail,
  LoadRelatedProducts,
  LoadSellerCatalogCount,
} from "../use-cases/product/product-use-cases";
import { LoadProduct } from "../use-cases/product/load-product";
import { LoadProfile } from "../use-cases/profile/load-profile";
import { SubmitProductFeedback } from "../use-cases/profile/submit-feedback";
import {
  AddToCart,
  LoadCart,
  RemoveFromCart,
  UpdateCartQuantity,
} from "../use-cases/cart/cart-use-cases";
import { LoadFavorites, ToggleFavorite } from "../use-cases/favorites/favorites-use-cases";
import { LoadOrderDetail, LoadOrders, ReorderItems, ShareOrder } from "../use-cases/order/order-use-cases";
import { LoadPickupPoints, QuoteCheckoutDelivery } from "../use-cases/wallet/wallet-use-cases";
import { LoadWallet } from "../use-cases/wallet/wallet-use-cases";
import {
  LoadSellerHome,
  LoadSellerOrders,
  LoadSellerProducts,
  LoadSellerPublicProfile,
} from "../use-cases/seller/seller-use-cases";
import { MemoryCacheRepository } from "../../infrastructure/cache/memory-cache-repository";
import { RestAuthRepository } from "../../infrastructure/repositories/rest-auth-repository";
import { RestCatalogRepository } from "../../infrastructure/repositories/rest-catalog-repository";
import { RestCartRepository } from "../../infrastructure/repositories/rest-cart-repository";
import { RestCheckoutRepository } from "../../infrastructure/repositories/rest-checkout-repository";
import { RestFavoritesRepository } from "../../infrastructure/repositories/rest-favorites-repository";
import { RestOrderRepository } from "../../infrastructure/repositories/rest-order-repository";
import { RestProductRepository } from "../../infrastructure/repositories/rest-product-repository";
import { RestProfileRepository } from "../../infrastructure/repositories/rest-profile-repository";
import { RestSearchRepository } from "../../infrastructure/repositories/rest-search-repository";
import { RestSellerRepository } from "../../infrastructure/repositories/rest-seller-repository";
import { RestTelemetryRepository, trackScreenEvent } from "../../infrastructure/repositories/rest-telemetry-repository";
import { RestWalletRepository } from "../../infrastructure/repositories/rest-wallet-repository";
import { getRestCommerceTransport } from "../../infrastructure/transport/rest-commerce-transport";

export type CommerceUseCases = {
  readonly loginUser: LoginUser;
  readonly logoutUser: LogoutUser;
  readonly loadCatalog: LoadCatalog;
  readonly loadCategories: LoadCategories;
  readonly loadCatalogPage: LoadCatalogPage;
  readonly searchProducts: SearchProducts;
  readonly loadProduct: LoadProduct;
  readonly loadProductDetail: LoadProductDetail;
  readonly loadRelatedProducts: LoadRelatedProducts;
  readonly loadSellerCatalogCount: LoadSellerCatalogCount;
  readonly loadProfile: LoadProfile;
  readonly submitProductFeedback: SubmitProductFeedback;
  readonly loadCart: LoadCart;
  readonly addToCart: AddToCart;
  readonly removeFromCart: RemoveFromCart;
  readonly updateCartQuantity: UpdateCartQuantity;
  readonly loadFavorites: LoadFavorites;
  readonly toggleFavorite: ToggleFavorite;
  readonly loadOrders: LoadOrders;
  readonly loadOrderDetail: LoadOrderDetail;
  readonly shareOrder: ShareOrder;
  readonly reorderItems: ReorderItems;
  readonly quoteCheckoutDelivery: QuoteCheckoutDelivery;
  readonly loadPickupPoints: LoadPickupPoints;
  readonly loadWallet: LoadWallet;
  readonly loadSellerHome: LoadSellerHome;
  readonly loadSellerProducts: LoadSellerProducts;
  readonly loadSellerOrders: LoadSellerOrders;
  readonly loadSellerPublicProfile: LoadSellerPublicProfile;
  readonly trackScreenEvent: (input: { screen: string; event: string; errorCode?: string }) => void;
  readonly events: ReturnType<typeof getDomainEventBus>;
};

let container: CommerceUseCases | null = null;
let telemetryRepo: RestTelemetryRepository | null = null;

export function getCommerceUseCases(): CommerceUseCases {
  if (container) return container;

  const transport = getRestCommerceTransport();
  const events = getDomainEventBus();
  const cache = new MemoryCacheRepository();
  void cache;

  const auth = new RestAuthRepository(transport);
  const catalog = new RestCatalogRepository(transport);
  const product = new RestProductRepository(transport);
  const cart = new RestCartRepository(transport);
  const favorites = new RestFavoritesRepository(transport);
  const profile = new RestProfileRepository(transport, auth);
  const search = new RestSearchRepository(transport);
  const order = new RestOrderRepository(transport);
  const checkout = new RestCheckoutRepository(transport);
  const wallet = new RestWalletRepository(transport);
  const seller = new RestSellerRepository(transport);
  telemetryRepo = new RestTelemetryRepository(transport);

  container = {
    loginUser: new LoginUser(auth, events),
    logoutUser: new LogoutUser(auth, events),
    loadCatalog: new LoadCatalog(catalog),
    loadCategories: new LoadCategories(catalog),
    loadCatalogPage: new LoadCatalogPage(catalog),
    searchProducts: new SearchProducts(search),
    loadProduct: new LoadProduct(product),
    loadProductDetail: new LoadProductDetail(product),
    loadRelatedProducts: new LoadRelatedProducts(catalog, product),
    loadSellerCatalogCount: new LoadSellerCatalogCount(catalog),
    loadProfile: new LoadProfile(profile, events),
    submitProductFeedback: new SubmitProductFeedback(profile),
    loadCart: new LoadCart(cart, events),
    addToCart: new AddToCart(cart, events),
    removeFromCart: new RemoveFromCart(cart, events),
    updateCartQuantity: new UpdateCartQuantity(cart, events),
    loadFavorites: new LoadFavorites(favorites),
    toggleFavorite: new ToggleFavorite(favorites, events),
    loadOrders: new LoadOrders(order),
    loadOrderDetail: new LoadOrderDetail(order),
    shareOrder: new ShareOrder(order),
    reorderItems: new ReorderItems(cart, events),
    quoteCheckoutDelivery: new QuoteCheckoutDelivery(checkout),
    loadPickupPoints: new LoadPickupPoints(checkout),
    loadWallet: new LoadWallet(wallet, events),
    loadSellerHome: new LoadSellerHome(seller),
    loadSellerProducts: new LoadSellerProducts(seller),
    loadSellerOrders: new LoadSellerOrders(seller, events),
    loadSellerPublicProfile: new LoadSellerPublicProfile(seller),
    trackScreenEvent: (input) => trackScreenEvent(telemetryRepo!, input),
    events,
  };

  return container;
}

export function resetCommerceContainerForTests(): void {
  container = null;
  telemetryRepo = null;
}
