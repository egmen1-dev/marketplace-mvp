/** Cart feature — guest localStorage + authenticated DB cart. */

export {
  getCartForUser,
  getCartProductsByIds,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  mergeGuestCartIntoUser,
  CartServiceError,
} from "./queries";
export {
  getCartAction,
  addToCartAction,
  updateCartItemAction,
  removeFromCartAction,
  mergeGuestCartAction,
} from "./actions";
export type {
  GuestCartItem,
  GuestCartStorage,
  CartProductSnapshot,
  CartLineItem,
  CartView,
  CartSummary,
  CartMutationResult,
} from "./types";
export {
  addToCartSchema,
  updateCartItemSchema,
  mergeCartSchema,
  type AddToCartInput,
  type UpdateCartItemInput,
  type MergeCartInput,
} from "./schemas";
export { CART_STORAGE_KEY } from "./lib/guest-storage";
