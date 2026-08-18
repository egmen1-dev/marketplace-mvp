import type { Money } from "../value-objects/money";

export type DeliveryMethod = "PICKUP" | "COURIER";

export type DeliveryRequest = {
  readonly city: string;
  readonly method: DeliveryMethod;
  readonly cartSubtotal: Money;
};

export type DeliveryQuote = {
  readonly price: Money;
  readonly etaLabel: string | null;
  readonly method: DeliveryMethod;
};

export type PickupPoint = {
  readonly code: string;
  readonly label: string;
  readonly address: string;
};

export type CheckoutForm = {
  readonly phone: string;
  readonly email: string;
  readonly fullName: string;
  readonly city: string;
  readonly method: DeliveryMethod;
  readonly pickupPointCode: string;
  readonly paymentMethod: "card" | "wallet";
  readonly comment: string;
};

export type CheckoutResult =
  | { readonly kind: "order"; readonly orderId: string }
  | { readonly kind: "redirect"; readonly url: string };
