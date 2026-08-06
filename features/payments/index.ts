/** Stripe Checkout + webhook payment flow. */

export {
  createCheckoutSessionForOrder,
  markOrderPaidFromCheckoutSession,
  markOrderPaidFromPaymentIntent,
  type CreateCheckoutSessionResult,
} from "./create-checkout-session";
export {
  handleStripeWebhook,
  type StripeWebhookResult,
} from "./webhook";
export {
  finalizePaidOrder,
  finalizePaidOrderInTx,
  type FinalizePaidOrderInput,
  type FinalizePaidOrderResult,
} from "@/features/orders/lib/finalize-paid-order";
export {
  PAYMENTS_NOT_CONFIGURED,
  PaymentServiceError,
} from "./errors";
export { toStripeAmount, toStripeCurrency } from "./lib/amounts";
