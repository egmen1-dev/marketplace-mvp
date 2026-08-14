import { pctRate } from "@/lib/analytics/funnel-metrics";

import type { FunnelStepDisplay } from "./funnel";

export type ConversionDropOff = {
  id: string;
  stage: string;
  severity: "high" | "medium" | "low";
  headline: string;
  detail: string;
  views?: number;
  conversions?: number;
  rate?: number | null;
};

const LOW_VIEW_TO_CART = 10;
const LOW_CHECKOUT = 25;

export function detectFunnelDropOffs(steps: FunnelStepDisplay[]): ConversionDropOff[] {
  const problems: ConversionDropOff[] = [];

  const product = steps.find((s) => s.id === "product");
  const cart = steps.find((s) => s.id === "cart");
  const checkout = steps.find((s) => s.id === "checkout");
  const payment = steps.find((s) => s.id === "payment");

  if (product && cart && product.uniqueVisitors >= 20) {
    const rate = pctRate(cart.uniqueVisitors, product.uniqueVisitors);
    if (rate != null && rate < LOW_VIEW_TO_CART) {
      problems.push({
        id: "pdp-to-cart",
        stage: "Product View → Add Cart",
        severity: rate < 5 ? "high" : "medium",
        headline: "Низкая конверсия карточки",
        detail: `${product.uniqueVisitors} просмотров, ${cart.uniqueVisitors} добавлений в корзину`,
        views: product.uniqueVisitors,
        conversions: cart.uniqueVisitors,
        rate,
      });
    }
  }

  if (cart && checkout && cart.uniqueVisitors >= 10) {
    const rate = pctRate(checkout.uniqueVisitors, cart.uniqueVisitors);
    if (rate != null && rate < LOW_CHECKOUT) {
      problems.push({
        id: "cart-to-checkout",
        stage: "Add Cart → Checkout",
        severity: "medium",
        headline: "Брошенная корзина на checkout",
        detail: `${cart.uniqueVisitors} корзин, ${checkout.uniqueVisitors} checkout`,
        views: cart.uniqueVisitors,
        conversions: checkout.uniqueVisitors,
        rate,
      });
    }
  }

  if (checkout && payment && checkout.uniqueVisitors >= 5) {
    const rate = pctRate(payment.uniqueVisitors, checkout.uniqueVisitors);
    if (rate != null && rate < 50) {
      problems.push({
        id: "checkout-to-payment",
        stage: "Checkout → Payment",
        severity: "high",
        headline: "Потери на оплате",
        detail: `${checkout.uniqueVisitors} checkout, ${payment.uniqueVisitors} покупок`,
        views: checkout.uniqueVisitors,
        conversions: payment.uniqueVisitors,
        rate,
      });
    }
  }

  return problems;
}

export function detectProductDropOff(input: {
  views: number;
  addToCart: number;
  minViews?: number;
}): ConversionDropOff | null {
  const minViews = input.minViews ?? 10;
  if (input.views < minViews) return null;

  const rate = pctRate(input.addToCart, input.views);
  if (rate == null || rate >= LOW_VIEW_TO_CART) return null;

  return {
    id: "product-dropoff",
    stage: "PDP",
    severity: rate < 5 ? "high" : "medium",
    headline: "Много просмотров — мало корзин",
    detail: `${input.views} просмотров, ${input.addToCart} добавлений в корзину`,
    views: input.views,
    conversions: input.addToCart,
    rate,
  };
}
