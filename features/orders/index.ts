/** Orders feature — checkout, order list & detail. */

export {
  createOrderFromCartAction,
  createCheckoutSessionAction,
  createPaymentIntentAction,
  type CreateOrderActionState,
} from "./actions";
export {
  createOrderFromCart,
  getOrderForUser,
  listOrdersForUser,
  OrderServiceError,
} from "./queries";
export {
  reserveInventory,
  releaseInventory,
  commitInventory,
  InventoryError,
} from "./lib/inventory";
export {
  setInventoryQuantity,
  decrementInventory,
  isLowStock,
  LOW_STOCK_THRESHOLD,
} from "./lib/inventory-sync";
export { checkoutFormSchema, type CheckoutFormInput } from "./schemas";
export type {
  CreateOrderResult,
  OrderDetail,
  OrderDeliveryView,
  OrderItemView,
  OrderListItem,
  OrderShippingView,
} from "./types";
export {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
  formatOrderDate,
  formatOrderStatus,
} from "./lib/status";
export {
  CheckoutForm,
  DeliverySection,
  OrderDetailView,
  OrderItemRow,
  OrderStatusBadge,
  OrdersList,
  PayOrderButton,
} from "./components";

