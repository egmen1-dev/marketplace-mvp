import type { Cart } from "../../domain/contracts/entities/cart";
import type { CartCommerceView, CartLineView } from "../cart-checkout/types";

export function cartToCommerceView(cart: Cart): CartCommerceView {
  const items: CartLineView[] = cart.lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    lineTotal: line.lineTotal.amount,
    title: line.title,
    price: line.unitPrice.amount,
    compareAt: null,
    imageUrl: line.imageUrl,
    sellerName: null,
    sellerId: line.sellerId,
    stock: line.stock,
    categoryId: null,
    qtyBusy: false,
    removing: false,
  }));

  return {
    items,
    itemCount: cart.itemCount,
    subtotal: cart.subtotal.amount,
    savings: cart.savings.amount,
    currency: cart.subtotal.currency,
  };
}
