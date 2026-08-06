import Stripe from "stripe";

import { getEnv } from "@/lib/env";

let stripeClient: Stripe | null = null;

/** True when Stripe secret key is configured (Checkout can run). */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return Boolean(key);
}

/**
 * Lazy Stripe SDK singleton.
 * Throws only when callers attempt to charge without keys — build stays safe.
 */
export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const secret = getEnv().STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripeClient = new Stripe(secret, {
    apiVersion: "2026-07-29.dahlia",
    typescript: true,
  });

  return stripeClient;
}
