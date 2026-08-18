/**
 * Sprint 93 — Composition root for commerce domain (hooks import from here).
 */

import { getDomainEventBus } from "../events/domain-event-bus";
import { LoadCatalog, LoadCategories } from "../use-cases/catalog/load-catalog";
import { SearchProducts } from "../use-cases/catalog/search-products";
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
import { MemoryCacheRepository } from "../../infrastructure/cache/memory-cache-repository";
import { RestAuthRepository } from "../../infrastructure/repositories/rest-auth-repository";
import { RestCatalogRepository } from "../../infrastructure/repositories/rest-catalog-repository";
import { RestCartRepository } from "../../infrastructure/repositories/rest-cart-repository";
import { RestFavoritesRepository } from "../../infrastructure/repositories/rest-favorites-repository";
import { RestProductRepository } from "../../infrastructure/repositories/rest-product-repository";
import { RestProfileRepository } from "../../infrastructure/repositories/rest-profile-repository";
import { RestSearchRepository } from "../../infrastructure/repositories/rest-search-repository";
import { getRestCommerceTransport } from "../../infrastructure/transport/rest-commerce-transport";

export type CommerceUseCases = {
  readonly loadCatalog: LoadCatalog;
  readonly loadCategories: LoadCategories;
  readonly searchProducts: SearchProducts;
  readonly loadProduct: LoadProduct;
  readonly loadProfile: LoadProfile;
  readonly submitProductFeedback: SubmitProductFeedback;
  readonly loadCart: LoadCart;
  readonly addToCart: AddToCart;
  readonly removeFromCart: RemoveFromCart;
  readonly updateCartQuantity: UpdateCartQuantity;
  readonly loadFavorites: LoadFavorites;
  readonly toggleFavorite: ToggleFavorite;
  readonly events: ReturnType<typeof getDomainEventBus>;
};

let container: CommerceUseCases | null = null;

export function getCommerceUseCases(): CommerceUseCases {
  if (container) return container;

  const transport = getRestCommerceTransport();
  const events = getDomainEventBus();
  const auth = new RestAuthRepository(transport);
  const catalog = new RestCatalogRepository(transport);
  const product = new RestProductRepository(transport);
  const cart = new RestCartRepository(transport);
  const favorites = new RestFavoritesRepository(transport);
  const profile = new RestProfileRepository(transport, auth);
  const search = new RestSearchRepository(transport);
  void new MemoryCacheRepository();

  container = {
    loadCatalog: new LoadCatalog(catalog),
    loadCategories: new LoadCategories(catalog),
    searchProducts: new SearchProducts(search),
    loadProduct: new LoadProduct(product),
    loadProfile: new LoadProfile(profile, events),
    submitProductFeedback: new SubmitProductFeedback(profile),
    loadCart: new LoadCart(cart, events),
    addToCart: new AddToCart(cart, events),
    removeFromCart: new RemoveFromCart(cart, events),
    updateCartQuantity: new UpdateCartQuantity(cart, events),
    loadFavorites: new LoadFavorites(favorites),
    toggleFavorite: new ToggleFavorite(favorites, events),
    events,
  };

  return container;
}

export function resetCommerceContainerForTests(): void {
  container = null;
}
